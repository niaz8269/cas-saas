<?php

namespace App\Services\Comms;

use App\Services\Comms\Channels\ChannelDriver;
use App\Services\Comms\Channels\EmailDriver;
use App\Services\Comms\Channels\LogDriver;

class ChannelManager
{
    public function for(string $channel): ChannelDriver
    {
        return match ($channel) {
            'email' => app(EmailDriver::class),
            default => app(LogDriver::class), // whatsapp|sms|in_app
        };
    }
}
