    <?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../lib/Database.php';
require_once __DIR__ . '/../lib/UserManager.php';
require_once __DIR__ . '/../lib/LiaraClient.php';

$config = require __DIR__ . '/../config/config.php';
$db = new Database($config['db']);
$pdo = $db->getConnection();
$userManager = new UserManager($pdo);
$liaraClient = new LiaraClient($config['api']);

// محدودیت بر اساس IP
$ip = $_SERVER['REMOTE_ADDR'];
$windowStart = date('Y-m-d H:i:00');
$stmt = $pdo->prepare("SELECT request_count FROM rate_limits WHERE ip_address = :ip AND window_start = :window");
$stmt->execute(['ip' => $ip, 'window' => $windowStart]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$maxPerMinute = $config['limits']['max_requests_per_minute'];

if ($row) {
    if ($row['request_count'] >= $maxPerMinute) {
        echo json_encode(['error' => '⏳ لطفاً کمی صبر کنید و بعد دوباره تلاش کنید.']);
        exit;
    }
    $pdo->prepare("UPDATE rate_limits SET request_count = request_count + 1 WHERE ip_address = :ip AND window_start = :window")
        ->execute(['ip' => $ip, 'window' => $windowStart]);
} else {
    $pdo->prepare("INSERT INTO rate_limits (ip_address, window_start, request_count) VALUES (:ip, :window, 1)")
        ->execute(['ip' => $ip, 'window' => $windowStart]);
}

// پردازش ورودی کاربر
$input = json_decode(file_get_contents('php://input'), true);
$text = $input['text'] ?? '';

if (!$text) {
    echo json_encode(['error' => 'متنی وارد نشده است.']);
    exit;
}

// ساخت درخواست برای Liara
$payload = [
    'model' => $config['api']['default_model'],
    'messages' => [
        ['role' => 'system', 'content' => 'لطفاً فقط احساس این متن را مشخص کن (مثبت، منفی یا خنثی) و آنالیز دقیق بده.'],
        ['role' => 'user', 'content' => $text]
    ]
];

try {
    $response = $liaraClient->sendRequest($payload);
    $content = $response['choices'][0]['message']['content'] ?? '';
    $tokensUsed = $response['usage']['total_tokens'] ?? 0;

    $pdo->prepare("
        INSERT INTO api_requests (user_id, ip_address, module, input_text, result, tokens_used)
        VALUES (0, :ip, 'analyze', :input_text, :result, :tokens_used)
    ")->execute([
        'ip' => $ip,
        'input_text' => $text,
        'result' => json_encode($response, JSON_UNESCAPED_UNICODE),
        'tokens_used' => $tokensUsed
    ]);

    echo json_encode(['result' => $content], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>