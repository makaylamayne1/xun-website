#!/usr/bin/env bash
# Run in AWS CloudShell after uploading aws-setup.zip and extracting it.
# Installs the contact Lambda and repairs only this website's API/email setup.
set -euo pipefail
umask 077
export AWS_PAGER=""

task_region="us-east-2"
task_account="811106941521"
task_api="ss3lnbimmb"
task_function="xun-website-contact"
task_email="xunchenecon@gmail.com"
task_endpoint="https://${task_api}.execute-api.${task_region}.amazonaws.com/contact"
task_function_arn="arn:aws:lambda:${task_region}:${task_account}:function:${task_function}"
task_source_arn="arn:aws:execute-api:${task_region}:${task_account}:${task_api}/*/POST/contact"
task_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
task_temp="$(mktemp -d)"
trap 'rm -rf -- "$task_temp"' EXIT

if [[ "$(aws sts get-caller-identity --query Account --output text)" != "$task_account" ]]; then
  echo "Stop: sign in to AWS account ${task_account}, then run this again."
  exit 1
fi
if [[ ! -f "$task_dir/lambda-upload.zip" || ! -f "$task_dir/EMAIL_SES.json" ]]; then
  echo "Keep this script, lambda-upload.zip, and EMAIL_SES.json in the same folder."
  exit 1
fi
verified="$(aws sesv2 get-email-identity --email-identity "$task_email" --region "$task_region" --query VerifiedForSendingStatus --output text)"
if [[ "$verified" != "True" && "$verified" != "true" ]]; then
  echo "Verify ${task_email} in SES in Ohio (us-east-2), then run this again."
  exit 1
fi

echo "Checking Lambda configuration..."
aws lambda get-function-configuration --function-name "$task_function" --region "$task_region" > "$task_temp/function.json"
python3 - "$task_temp/function.json" "$task_temp/environment.json" <<'PY'
import json, sys
config = json.load(open(sys.argv[1]))
variables = config.get('Environment', {}).get('Variables', {})
if not variables.get('TURNSTILE_SECRET_KEY', '').strip():
    raise SystemExit('Set TURNSTILE_SECRET_KEY in Lambda environment variables, then rerun. Use the Secret key from the same Cloudflare widget as the website Site key.')
variables.update({
    'CONTACT_FROM': 'xunchenecon@gmail.com',
    'CONTACT_TO': 'xunchenecon@gmail.com',
    'SES_REGION': 'us-east-2',
    'ALLOWED_ORIGINS': 'http://localhost:3000,https://www.xun-chen.com,https://xun-chen.com',
})
with open(sys.argv[2], 'w') as out:
    json.dump({'Variables': variables}, out)
PY
task_role="$(python3 - "$task_temp/function.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))['Role'].rsplit('/', 1)[-1])
PY
)"
aws iam put-role-policy --role-name "$task_role" --policy-name EMAIL_SES --policy-document "file://$task_dir/EMAIL_SES.json"
aws iam attach-role-policy --role-name "$task_role" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

echo "Installing Lambda index.js (CommonJS)..."
aws lambda wait function-updated --function-name "$task_function" --region "$task_region"
aws lambda update-function-code --function-name "$task_function" --region "$task_region" --zip-file "fileb://$task_dir/lambda-upload.zip" --query '{Function:FunctionName,State:State}' --output json
aws lambda wait function-updated --function-name "$task_function" --region "$task_region"
aws lambda update-function-configuration --function-name "$task_function" --region "$task_region" --runtime nodejs24.x --handler index.handler --timeout 15 --memory-size 256 --environment "file://$task_temp/environment.json" --query '{Function:FunctionName,Runtime:Runtime,Handler:Handler}' --output json
aws lambda wait function-updated --function-name "$task_function" --region "$task_region"

echo "Connecting POST /contact to the Lambda..."
task_integration="$(aws apigatewayv2 get-integrations --api-id "$task_api" --region "$task_region" --query "Items[?IntegrationUri=='${task_function_arn}'].IntegrationId | [0]" --output text)"
if [[ -z "$task_integration" || "$task_integration" == "None" ]]; then
  task_integration="$(aws apigatewayv2 create-integration --api-id "$task_api" --region "$task_region" --integration-type AWS_PROXY --integration-method POST --integration-uri "$task_function_arn" --payload-format-version 2.0 --query IntegrationId --output text)"
else
  aws apigatewayv2 update-integration --api-id "$task_api" --region "$task_region" --integration-id "$task_integration" --integration-method POST --integration-uri "$task_function_arn" --payload-format-version 2.0 --query IntegrationId --output text
fi
task_route="$(aws apigatewayv2 get-routes --api-id "$task_api" --region "$task_region" --query "Items[?RouteKey=='POST /contact'].RouteId | [0]" --output text)"
if [[ -z "$task_route" || "$task_route" == "None" ]]; then
  aws apigatewayv2 create-route --api-id "$task_api" --region "$task_region" --route-key 'POST /contact' --authorization-type NONE --target "integrations/$task_integration" --query RouteId --output text
else
  aws apigatewayv2 update-route --api-id "$task_api" --region "$task_region" --route-id "$task_route" --authorization-type NONE --target "integrations/$task_integration" --query RouteId --output text
fi

# This resource policy authorizes only POST /contact from this specific API.
# Re-running the script checks the existing statement instead of deleting it.
if ! aws lambda add-permission --function-name "$task_function" --region "$task_region" --statement-id website-contact-repair-post --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "$task_source_arn" > "$task_temp/permission.json" 2> "$task_temp/permission-error.txt"; then
  if ! grep -q ResourceConflictException "$task_temp/permission-error.txt"; then
    cat "$task_temp/permission-error.txt" >&2
    exit 1
  fi
  aws lambda get-policy --function-name "$task_function" --region "$task_region" --query Policy --output text > "$task_temp/policy.json"
  python3 - "$task_temp/policy.json" "$task_source_arn" "$task_function_arn" <<'PY'
import json, sys
statements = json.load(open(sys.argv[1])).get('Statement', [])
matches = [s for s in statements if s.get('Sid') == 'website-contact-repair-post']
if len(matches) != 1:
    raise SystemExit('Could not confirm the existing invocation permission.')
s = matches[0]
if not (s.get('Effect') == 'Allow'
        and s.get('Action') == 'lambda:InvokeFunction'
        and s.get('Resource') == sys.argv[3]
        and s.get('Principal', {}).get('Service') == 'apigateway.amazonaws.com'
        and s.get('Condition', {}).get('ArnLike', {}).get('AWS:SourceArn') == sys.argv[2]):
    raise SystemExit('The existing website-contact-repair-post permission differs. Inspect it in Lambda Permissions before continuing.')
PY
fi

aws apigatewayv2 update-api --api-id "$task_api" --region "$task_region" --cors-configuration '{"AllowOrigins":["http://localhost:3000","https://www.xun-chen.com","https://xun-chen.com"],"AllowMethods":["POST","OPTIONS"],"AllowHeaders":["content-type"],"AllowCredentials":false}' --query ApiId --output text

# Access logs reveal the actual integration failure if an AWS problem remains.
task_log_group="/aws/apigateway/xun-website-contact"
task_log_count="$(aws logs describe-log-groups --region "$task_region" --log-group-name-prefix "$task_log_group" --query "length(logGroups[?logGroupName=='${task_log_group}'])" --output text)"
if [[ "$task_log_count" == "0" ]]; then
  aws logs create-log-group --region "$task_region" --log-group-name "$task_log_group"
  aws logs put-retention-policy --region "$task_region" --log-group-name "$task_log_group" --retention-in-days 7
fi
python3 - "$task_temp/log-settings.json" <<'PY'
import json, sys
settings = {
    'DestinationArn': 'arn:aws:logs:us-east-2:811106941521:log-group:/aws/apigateway/xun-website-contact',
    'Format': json.dumps({
        'requestId': '$context.requestId',
        'status': '$context.status',
        'route': '$context.routeKey',
        'integrationError': '$context.integrationErrorMessage',
    }),
}
with open(sys.argv[1], 'w') as out:
    json.dump(settings, out)
PY
aws apigatewayv2 get-stages --api-id "$task_api" --region "$task_region" > "$task_temp/stages.json"
task_has_default="$(python3 - "$task_temp/stages.json" <<'PY'
import json, sys
print('yes' if any(s['StageName'] == '$default' for s in json.load(open(sys.argv[1])).get('Items', [])) else 'no')
PY
)"
if [[ "$task_has_default" == "no" ]]; then
  aws apigatewayv2 create-stage --api-id "$task_api" --region "$task_region" --stage-name '$default' --auto-deploy --access-log-settings "file://$task_temp/log-settings.json" --query StageName --output text
else
  aws apigatewayv2 update-stage --api-id "$task_api" --region "$task_region" --stage-name '$default' --auto-deploy --access-log-settings "file://$task_temp/log-settings.json" --query StageName --output text
fi

echo "Testing the connection with an EMPTY form. This sends no email."
task_code=""
for task_attempt in 1 2 3 4 5 6; do
  task_code="$(curl -sS --max-time 25 -o "$task_temp/response.json" -w '%{http_code}' "$task_endpoint" -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' --data '{}')"
  if [[ "$task_code" == "400" ]]; then break; fi
  sleep 3
done
cat "$task_temp/response.json"
echo
if [[ "$task_code" != "400" ]]; then
  echo "Connection check failed: HTTP ${task_code}. Inspect the integrationError in CloudWatch log group ${task_log_group}."
  echo "Lambda logs: /aws/lambda/${task_function}"
  exit 1
fi
python3 - "$task_temp/response.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
if data.get('success') is not False or data.get('message') != 'Check your name, email, and message.':
    raise SystemExit('Unexpected validation response; inspect the deployed Lambda.')
PY
echo "Connection check PASSED: HTTP 400 is expected for an empty form."
echo "Now open the website, solve Turnstile, and submit a real message."
echo "Expected recipient: ${task_email}. The real form submission is still needed to verify CAPTCHA and email delivery."
