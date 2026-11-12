<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Sent to the CAS enquiry inbox when someone submits the website pop-up form. The visitor is on Reply-To, so
 * replying to the email reaches them directly.
 */
class NewEnquiryMail extends Mailable
{
    /**
     * @param  array<string, string|null>  $details  Label => value, in the order they are shown.
     */
    public function __construct(
        public readonly string $visitorName,
        public readonly ?string $visitorEmail,
        public readonly array $details,
    ) {}

    public function envelope(): Envelope
    {
        $summary = collect([$this->details['Degree'] ?? null, $this->details['Program'] ?? null])->filter()->implode(' / ');

        return new Envelope(
            replyTo: $this->visitorEmail ? [new Address($this->visitorEmail, $this->visitorName)] : [],
            subject: 'New website enquiry: '.$this->visitorName.($summary !== '' ? ' ('.$summary.')' : ''),
        );
    }

    public function content(): Content
    {
        $rows = collect($this->details)
            ->filter(fn ($v) => filled($v))
            ->map(fn ($v, $k) => '<tr><td style="padding:6px 14px 6px 0;color:#64748B;vertical-align:top">'.e($k).'</td><td style="padding:6px 0;color:#1F2933">'.nl2br(e((string) $v)).'</td></tr>')
            ->implode('');

        return new Content(htmlString: '<div style="font-family:Arial,sans-serif;font-size:14px">'
            .'<p>A new enquiry came in from the CAS website pop-up form.</p>'
            .'<table cellspacing="0" cellpadding="0" style="border-collapse:collapse">'.$rows.'</table>'
            .'<p style="color:#64748B;margin-top:18px">The enquiry is also saved as a lead in the CAS admin panel.</p></div>');
    }
}
