package com.luminaread.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.net.InetSocketAddress
import java.net.Socket
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {

    private var hasNativeLib = false
    private external fun startNativeServer(dataDir: String, port: Int): Int

    init {
        try {
            System.loadLibrary("luminaread")
            hasNativeLib = true
        } catch (_: UnsatisfiedLinkError) {
            hasNativeLib = false
        }
    }

    private lateinit var webView: WebView
    private val localPort = 3456
    private var serverUrl = "http://127.0.0.1:3456"
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val uris: Array<Uri>? = if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            when {
                data?.clipData != null -> {
                    val count = data.clipData!!.itemCount
                    val list = mutableListOf<Uri>()
                    for (i in 0 until count) {
                        data.clipData!!.getItemAt(i)?.uri?.let { list.add(it) }
                    }
                    list.toTypedArray()
                }
                data?.data != null -> arrayOf(data.data!!)
                else -> null
            }
        } else {
            null
        }
        fileUploadCallback?.onReceiveValue(uris)
        fileUploadCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()

        val prefs = getSharedPreferences("luminaread_cfg", Context.MODE_PRIVATE)

        if (hasNativeLib) {
            // 方案二：嵌入式单机离线模式，始终优先指向本地 127.0.0.1
            serverUrl = "http://127.0.0.1:$localPort"
            val dataDir = File(filesDir, "luminaread_data")
            if (!dataDir.exists()) dataDir.mkdirs()

            thread(name = "RustInitThread") {
                try {
                    val ret = startNativeServer(dataDir.absolutePath, localPort)
                    if (ret == 0) {
                        // 等待本地端口就绪（最多等待 3 秒）
                        var ready = false
                        for (i in 0..60) {
                            try {
                                Socket().use { s ->
                                    s.connect(InetSocketAddress("127.0.0.1", localPort), 100)
                                    ready = true
                                }
                                break
                            } catch (_: Exception) {
                                Thread.sleep(50)
                            }
                        }
                        if (ready) {
                            runOnUiThread { loadApp() }
                        }
                    }
                } catch (e: Throwable) {
                    e.printStackTrace()
                }
            }
        } else {
            // 仅在无本地原生库时才降级使用远程服务地址
            serverUrl = prefs.getString("server_url", "http://127.0.0.1:3456") ?: "http://127.0.0.1:3456"
        }

        webView = WebView(this)
        setContentView(webView)
        configureWebView()

        // 如果不是本地 native 库（即客户端模式），直接开始加载目标服务
        if (!hasNativeLib) {
            loadApp()
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val s = webView.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.databaseEnabled = true
        s.useWideViewPort = true
        s.loadWithOverviewMode = true
        s.allowFileAccess = true
        s.allowContentAccess = true
        s.cacheMode = WebSettings.LOAD_DEFAULT
        s.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView?, req: WebResourceRequest?, err: WebResourceError?) {
                super.onReceivedError(view, req, err)
                if (req?.isForMainFrame == true) {
                    view?.postDelayed({ loadApp() }, 2000)
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                    if (fileChooserParams?.mode == FileChooserParams.MODE_OPEN_MULTIPLE) {
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    }
                }

                return try {
                    filePickerLauncher.launch(intent)
                    true
                } catch (e: Exception) {
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = null
                    false
                }
            }
        }
    }

    private fun loadApp() {
        webView.loadUrl(serverUrl)
    }
}
