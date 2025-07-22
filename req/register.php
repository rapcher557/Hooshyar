<?php
header("Content-Type: application/json");
try {
    $input = json_decode(file_get_contents("php://input"), true);
    $email = trim($input["email"] ?? '');
    $name = trim($input["name"] ?? '');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["error" => "ایمیل معتبر نیست."]);
        exit;
    }

    $db = new PDO('mysql:host=localhost;dbname=hooshyar;charset=utf8', 'root', '');

    $stmt = $db->prepare("SELECT api_key FROM api_users WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        echo json_encode(["api_key" => $existing["api_key"]]);
        exit;
    }

    $apiKey = bin2hex(random_bytes(16));

    $stmt = $db->prepare("INSERT INTO api_users (name, email, api_key) VALUES (?, ?, ?)");
    $stmt->execute([$name, $email, $apiKey]);

    echo json_encode(["api_key" => $apiKey]);

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
