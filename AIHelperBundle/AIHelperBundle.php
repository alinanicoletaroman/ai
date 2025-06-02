<?php

namespace App\AIHelperBundle;

use Pimcore\Extension\Bundle\AbstractPimcoreBundle;
use Pimcore\Extension\Bundle\PimcoreBundleAdminClassicInterface;

class AIHelperBundle extends AbstractPimcoreBundle implements PimcoreBundleAdminClassicInterface
{
    public function getJsPaths(): array
    {
        return [
            '/bundles/aihelper/js/ai-quill.js',
        ];
    }

    public function getEditmodeJsPaths() : array
    {
        return [
            '/bundles/aihelper/js/ai-quill.js',
        ];
    }

    public function getEditmodeCssPaths() : array
    {
       return [];
    }

    public function getCssPaths() : array
    {
        return [];

    }





}
