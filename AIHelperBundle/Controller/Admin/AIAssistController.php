<?php

namespace App\AIHelperBundle\Controller\Admin;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Csrf\CsrfToken;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

#[Route('/ai')]
class AIAssistController extends AbstractController
{


    #[Route('/process', name: 'ai_process', methods: ['POST'])]
    public function process(Request $request, HttpClientInterface $httpClient): JsonResponse
    {
        $text = $request->request->get('text');
        $action = $request->request->get('action', 'default');
        $sourceLang = $request->request->get('sourceLang', 'de'); // optional: from JS
        $targetLang = $request->request->get('targetLang', 'en'); // optional: from JS

        $openaiApiKey = $_ENV['OPENAI_API_KEY'];

        $prompt = match ($action) {
            'translate' => "Translate this text from $sourceLang to $targetLang:\n\n" . $text,
            'grammar'   => "Correct the grammar in this text:\n\n" . $text,
            'complete'  => "Expand this text with more detail and complete any unfinished thoughts:\n\n" . $text,
            default     => "Process this text:\n\n" . $text,
        };

        $response = $httpClient->request('POST', 'https://api.openai.com/v1/chat/completions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $openaiApiKey,
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'model' => 'gpt-4',
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'temperature' => 0.1
            ]
        ]);

        $result = $response->toArray();
        $aiText = $result['choices'][0]['message']['content'] ?? '[No result]';

        return new JsonResponse(['result' => $aiText]);
    }

}
