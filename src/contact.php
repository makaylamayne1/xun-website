
<?php
/*
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(["success" => true]);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || !is_array($data)) {
    echo json_encode([
        "success" => false,
        "message" => "No JSON data received."
    ]);
    exit;
}

$firstName = trim($data["firstName"] ?? "");
$lastName  = trim($data["lastName"] ?? "");
$phone     = trim($data["phone"] ?? "");
$email     = trim($data["email"] ?? "");
$message   = trim($data["message"] ?? "");
$issue     = trim($data["issue"] ?? "");

if ($firstName === "" || $email === "" || $message === "" || $issue === "") {
    echo json_encode([
        "success" => false,
        "message" => "Please fill in all required fields."
    ]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid email address."
    ]);
    exit;
}

// Destination email can be set in environment variable CONTACT_TO
$to = getenv('CONTACT_TO') ?: 'admin@localhost';
$subject = "New Contact Form Submission";

$body = "First Name: $firstName\n"
      . "Last Name: $lastName\n"
      . "Phone: $phone\n"
      . "Email: $email\n"
      . "Type: $issue\n\n"
      . "Message:\n$message";

$headers = "From: noreply@" . ($_SERVER['SERVER_NAME'] ?? 'localhost') . "\r\n";
$headers .= "Reply-To: $email\r\n";

$sent = false;
// Try to use mail(), but fall back to saving the submission locally if mail is not available
if (function_exists('mail')) {
    $sent = @mail($to, $subject, $body, $headers);
}

if ($sent) {
    echo json_encode([
        "success" => true,
        "message" => "Your message has been sent."
    ]);
    exit;
}

// Fallback: save submission to a local file for later processing
$storageDir = __DIR__ . '/submissions';
if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0755, true);
}

$entry = [
    'firstName' => $firstName,
    'lastName' => $lastName,
    'phone' => $phone,
    'email' => $email,
    'issue' => $issue,
    'message' => $message,
    'received_at' => date('c'),
    'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? null,
];

$file = $storageDir . '/contact_submissions.jsonl';
$line = json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
if (@file_put_contents($file, $line, FILE_APPEND | LOCK_EX) !== false) {
    echo json_encode([
        "success" => true,
        "message" => "Submission saved (mail unavailable)."
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Could not send or save message."
    ]);
}
*/
?>
