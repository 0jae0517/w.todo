package com.wtodo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The web view scales text with the phone's font-size setting, but icons,
        // calendar cells and checkboxes keep their size, so text spilled out of its
        // boxes and sat off-center. Keep the layout's own sizes, as the web does.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
