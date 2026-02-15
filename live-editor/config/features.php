<?php
return [
    'multi_tenant' => getenv('ENABLE_MULTI_TENANT') === 'true',
    'billing' => getenv('ENABLE_BILLING') === 'true',
    'limits' => getenv('ENABLE_LIMITS') === 'true',
    'cloud_render' => getenv('ENABLE_CLOUD_RENDER') !== 'false',
];
