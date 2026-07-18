<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Comms\TestMessageTemplateRequest;
use App\Models\Student;
use App\Services\Comms\Templates;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Message templates for the settings screen. The copy is defined in code
 * (Templates::TEMPLATES); admins can list them and fire a test send to
 * verify rendering and the delivery channel.
 */
class MessageTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        $data = collect(Templates::TEMPLATES)->map(fn (array $tpl, string $key) => [
            'key' => $key,
            'subject' => $tpl['subject'],
            'preview' => Str::limit(str_replace("\n", ' ', $tpl['body']), 120),
        ])->values();

        return response()->json(['data' => $data]);
    }

    /**
     * Render a template against sample data and deliver it once so the admin
     * can confirm it works. Email goes to the given address (or the admin's
     * own); other channels record to the log driver like the production stubs.
     */
    public function test(TestMessageTemplateRequest $request, string $template): JsonResponse
    {
        abort_unless(array_key_exists($template, Templates::TEMPLATES), 404);

        $channel = (string) $request->input('channel');

        $sample = new Student([
            'first_name' => 'Sample',
            'last_name' => 'Student',
            'student_code' => 'STU-SAMPLE-001',
        ]);

        ['subject' => $subject, 'body' => $body] = app(Templates::class)->render($template, $sample, [
            'program' => 'MBBS',
            'university' => 'Jilin Medical University',
            'body' => 'This is a sample message body for the custom template.',
        ]);

        $to = $request->input('to') ?: $request->user()->email;

        if ($channel === 'email') {
            Mail::raw($body, fn ($message) => $message->to($to)->subject("[TEST] {$subject}"));
        } else {
            Log::info('Message template test dispatched (log driver)', [
                'template' => $template,
                'channel' => $channel,
                'to' => $to,
            ]);
        }

        return response()->json(['data' => [
            'template' => $template,
            'channel' => $channel,
            'to' => $to,
            'subject' => $subject,
            'body' => $body,
            'status' => 'sent',
        ]]);
    }
}
