<?php
class LiaraClient {
    private $apiKey;
    private $baseUrl;

    public function __construct($config) {
        $this->apiKey = $config['api_key'];
        $this->baseUrl = $config['base_url'];
    }

    public function sendRequest($payload) {
        $ch = curl_init($this->baseUrl);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$this->apiKey}",
                "Content-Type: application/json"
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 5
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL Error: $error");
        }

        $data = json_decode($response, true);
        if (!$data) {
            throw new Exception("Invalid JSON response: $response");
        }

        return $data;
    }
}
