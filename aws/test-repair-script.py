"""Exercise the CloudShell repair without AWS credentials, network, or email."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


FAKE_AWS = r'''#!/usr/bin/env python3
import json, os, pathlib, sys
a = sys.argv[1:]
def val(flag): return a[a.index(flag)+1]
def out(value): print(value if isinstance(value, str) else json.dumps(value))
with open(os.environ['TEST_CALLS'], 'a') as log: log.write(json.dumps(a)+'\n')
mode = os.environ['TEST_MODE']
c = tuple(a[:2])
if c == ('sts','get-caller-identity'): out('811106941521')
elif c == ('sesv2','get-email-identity'): out('True')
elif c == ('lambda','get-function-configuration'):
    out({'Role':'arn:aws:iam::811106941521:role/contact-role', 'Environment':{'Variables':{'TURNSTILE_SECRET_KEY':'unit-test-secret','PRESERVE_THIS':'yes'}}})
elif c == ('lambda','update-function-configuration'):
    config=json.load(open(val('--environment').removeprefix('file://')))
    assert config['Variables']['TURNSTILE_SECRET_KEY']=='unit-test-secret'
    assert config['Variables']['PRESERVE_THIS']=='yes'
    assert config['Variables']['CONTACT_FROM']=='xunchenecon@gmail.com'
    assert config['Variables']['CONTACT_TO']=='xunchenecon@gmail.com'
    assert val('--handler')=='index.handler'
    out({'Function':val('--function-name')})
elif c == ('lambda','add-permission'):
    assert val('--source-arn')=='arn:aws:execute-api:us-east-2:811106941521:ss3lnbimmb/*/POST/contact'
    if mode=='existing':
        print('ResourceConflictException',file=sys.stderr); sys.exit(1)
    out({'Statement':'test'})
elif c == ('lambda','get-policy'):
    out({'Statement':[{'Sid':'website-contact-repair-post','Effect':'Allow','Action':'lambda:InvokeFunction','Resource':'arn:aws:lambda:us-east-2:811106941521:function:xun-website-contact','Principal':{'Service':'apigateway.amazonaws.com'},'Condition':{'ArnLike':{'AWS:SourceArn':'arn:aws:execute-api:us-east-2:811106941521:ss3lnbimmb/*/POST/contact'}}}]})
elif c == ('iam','put-role-policy'):
    policy=json.load(open(val('--policy-document').removeprefix('file://')))
    assert policy['Statement'][0]['Action']=='ses:SendEmail'
    assert policy['Statement'][0]['Condition']['ForAllValues:StringEquals']['ses:Recipients']==['xunchenecon@gmail.com']
elif c == ('apigatewayv2','get-integrations'): out('1awyfah' if mode=='existing' else 'None')
elif c == ('apigatewayv2','create-integration'): out('new-integration')
elif c == ('apigatewayv2','get-routes'): out('route-1' if mode=='existing' else 'None')
elif c in [('apigatewayv2','create-route'),('apigatewayv2','update-route')]:
    if '--route-key' in a: assert val('--route-key')=='POST /contact'
    assert val('--authorization-type')=='NONE'
    out('route-1')
elif c == ('apigatewayv2','get-stages'): out({'Items':[{'StageName':'$default'}] if mode=='existing' else []})
elif c in [('apigatewayv2','update-stage'),('apigatewayv2','create-stage')]:
    assert val('--stage-name')=='$default'
    settings=json.load(open(val('--access-log-settings').removeprefix('file://')))
    assert '$context.integrationErrorMessage' in settings['Format']
    out('$default')
elif c == ('logs','describe-log-groups'): out('1' if mode=='existing' else '0')
elif c in [('iam','attach-role-policy'),('lambda','wait'),('lambda','update-function-code'),('apigatewayv2','update-integration'),('apigatewayv2','update-api'),('logs','create-log-group'),('logs','put-retention-policy')]: pass
else: raise SystemExit('Unhandled fake AWS call: '+repr(a))
'''

FAKE_CURL = r'''#!/usr/bin/env python3
import json, pathlib, sys
a=sys.argv[1:]
assert a[a.index('--data')+1]=='{}', 'The repair must not send a real email.'
assert 'https://ss3lnbimmb.execute-api.us-east-2.amazonaws.com/contact' in a
pathlib.Path(a[a.index('-o')+1]).write_text(json.dumps({'success':False,'message':'Check your name, email, and message.'}))
print('400',end='')
'''


class RepairScriptTests(unittest.TestCase):
    def exercise(self, mode):
        source = Path(__file__).resolve().parent
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            binary = root / 'bin'
            binary.mkdir()
            for command, content in [('aws', FAKE_AWS), ('curl', FAKE_CURL)]:
                path = binary / command
                path.write_text(content)
                path.chmod(0o700)
            for filename in ['repair-contact.sh', 'lambda-upload.zip', 'EMAIL_SES.json']:
                shutil.copy2(source / filename, root / filename)
            calls_file = root / 'calls.jsonl'
            env = {**os.environ, 'PATH': str(binary)+os.pathsep+os.environ['PATH'], 'TEST_CALLS': str(calls_file), 'TEST_MODE': mode}
            result = subprocess.run(['bash', str(root/'repair-contact.sh')], env=env, text=True, capture_output=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stderr+result.stdout)
            self.assertIn('Connection check PASSED', result.stdout)
            self.assertNotIn('unit-test-secret', result.stdout+result.stderr)
            calls = [json.loads(line) for line in calls_file.read_text().splitlines()]
            operations = [tuple(call[:2]) for call in calls]
            self.assertIn(('lambda','update-function-code'), operations)
            self.assertIn(('lambda','update-function-configuration'), operations)
            expected = 'update-route' if mode=='existing' else 'create-route'
            self.assertIn(('apigatewayv2',expected), operations)
            self.assertFalse(any(c[:2]==['lambda','remove-permission'] for c in calls))

    def test_repairs_missing_route_integration_and_stage(self):
        self.exercise('missing')

    def test_existing_resources_and_permission_are_reusable(self):
        self.exercise('existing')


if __name__ == '__main__':
    unittest.main()
