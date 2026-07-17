<?php

namespace App\Services\Comms\Channels;

use App\Models\Communication;

interface ChannelDriver
{
    /**
     * Deliver the communication. Returns the provider result to log.
     *
     * @return array{provider: string, provider_msg_id: string|null, status: string, error: string|null}
     */
    public function send(Communication $communication, ?string $subject): array;
}
