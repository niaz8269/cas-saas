<?php

it('reports liveness on /health', function () {
    $this->getJson('/health')
        ->assertOk()
        ->assertJson([
            'status' => 'ok',
        ])
        ->assertJsonStructure(['status', 'app', 'env', 'time']);
});

it('reports per-dependency checks on /ready', function () {
    // In the test environment the database is sqlite in-memory (always up);
    // redis may be down locally — /ready must degrade gracefully, never 500.
    $response = $this->getJson('/ready');

    expect($response->getStatusCode())->toBeIn([200, 503]);

    $response->assertJsonStructure(['status', 'checks' => ['database', 'redis']]);
    $response->assertJsonPath('checks.database', 'ok');
});

it('identifies the API at the root route', function () {
    $this->getJson('/')
        ->assertOk()
        ->assertJson(['status' => 'ok']);
});
