#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "ParameterIDs.h"

#if HAS_WEB_UI_DATA
#include "WebUIData.h"
#endif

OxideAudioProcessorEditor::OxideAudioProcessorEditor(OxideAudioProcessor& p)
    : AudioProcessorEditor(&p), processorRef(p)
{
    setSize(850, 550);
    setResizable(false, false);

    // Create relays BEFORE WebBrowserComponent
    bitcrushRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::bitcrush);
    downsampleRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::downsample);
    noiseRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::noise);
    crackleRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::crackle);
    wobbleRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::wobble);
    dropoutRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::dropout);
    saturationRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::saturation);
    ageRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::age);
    filterCutoffRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::filterCutoff);
    filterResRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::filterRes);
    filterDriveRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::filterDrive);
    modeRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::mode);
    mixRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::mix);
    outputRelay = std::make_unique<juce::WebSliderRelay>(ParameterIDs::output);
    bypassRelay = std::make_unique<juce::WebToggleButtonRelay>(ParameterIDs::bypass);

    setupWebView();

    // Create attachments AFTER WebBrowserComponent
    auto& apvts = processorRef.getAPVTS();
    bitcrushAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::bitcrush), *bitcrushRelay, nullptr);
    downsampleAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::downsample), *downsampleRelay, nullptr);
    noiseAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::noise), *noiseRelay, nullptr);
    crackleAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::crackle), *crackleRelay, nullptr);
    wobbleAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::wobble), *wobbleRelay, nullptr);
    dropoutAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::dropout), *dropoutRelay, nullptr);
    saturationAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::saturation), *saturationRelay, nullptr);
    ageAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::age), *ageRelay, nullptr);
    filterCutoffAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::filterCutoff), *filterCutoffRelay, nullptr);
    filterResAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::filterRes), *filterResRelay, nullptr);
    filterDriveAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::filterDrive), *filterDriveRelay, nullptr);
    modeAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::mode), *modeRelay, nullptr);
    mixAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::mix), *mixRelay, nullptr);
    outputAttachment = std::make_unique<juce::WebSliderParameterAttachment>(
        *apvts.getParameter(ParameterIDs::output), *outputRelay, nullptr);
    bypassAttachment = std::make_unique<juce::WebToggleButtonParameterAttachment>(
        *apvts.getParameter(ParameterIDs::bypass), *bypassRelay, nullptr);

    // Start visualizer timer (60fps)
    visualizerTimer.startTimerHz(60);
}

OxideAudioProcessorEditor::~OxideAudioProcessorEditor()
{
    visualizerTimer.stopTimer();
}

void OxideAudioProcessorEditor::setupWebView()
{
    // Find resources directory
    auto executableFile = juce::File::getSpecialLocation(juce::File::currentExecutableFile);
    auto executableDir = executableFile.getParentDirectory();

    resourcesDir_ = executableDir.getChildFile("Resources").getChildFile("WebUI");
    if (!resourcesDir_.isDirectory())
        resourcesDir_ = executableDir.getChildFile("WebUI");
    if (!resourcesDir_.isDirectory())
        resourcesDir_ = executableDir.getParentDirectory().getChildFile("Resources").getChildFile("WebUI");

    DBG("Resources dir: " + resourcesDir_.getFullPathName());

    auto options = juce::WebBrowserComponent::Options()
        .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
        .withNativeIntegrationEnabled()
        .withResourceProvider(
            [this](const juce::String& url) -> std::optional<juce::WebBrowserComponent::Resource>
            {
                auto path = url;
                if (path.startsWith("/")) path = path.substring(1);
                if (path.isEmpty()) path = "index.html";

                auto file = resourcesDir_.getChildFile(path);
                if (!file.existsAsFile()) return std::nullopt;

                juce::String mimeType = "application/octet-stream";
                if (path.endsWith(".html")) mimeType = "text/html";
                else if (path.endsWith(".css")) mimeType = "text/css";
                else if (path.endsWith(".js")) mimeType = "application/javascript";
                else if (path.endsWith(".json")) mimeType = "application/json";
                else if (path.endsWith(".png")) mimeType = "image/png";
                else if (path.endsWith(".svg")) mimeType = "image/svg+xml";
                else if (path.endsWith(".woff2")) mimeType = "font/woff2";

                juce::MemoryBlock data;
                file.loadFileAsData(data);

                return juce::WebBrowserComponent::Resource{
                    std::vector<std::byte>(
                        reinterpret_cast<const std::byte*>(data.getData()),
                        reinterpret_cast<const std::byte*>(data.getData()) + data.getSize()),
                    mimeType.toStdString()
                };
            })
        .withOptionsFrom(*bitcrushRelay)
        .withOptionsFrom(*downsampleRelay)
        .withOptionsFrom(*noiseRelay)
        .withOptionsFrom(*crackleRelay)
        .withOptionsFrom(*wobbleRelay)
        .withOptionsFrom(*dropoutRelay)
        .withOptionsFrom(*saturationRelay)
        .withOptionsFrom(*ageRelay)
        .withOptionsFrom(*filterCutoffRelay)
        .withOptionsFrom(*filterResRelay)
        .withOptionsFrom(*filterDriveRelay)
        .withOptionsFrom(*modeRelay)
        .withOptionsFrom(*mixRelay)
        .withOptionsFrom(*outputRelay)
        .withOptionsFrom(*bypassRelay)
        .withEventListener("getActivationStatus", [this](const juce::var&) {
            juce::DynamicObject::Ptr data = new juce::DynamicObject();
#if BEATCONNECT_ACTIVATION_ENABLED
            data->setProperty("isConfigured", processorRef.hasActivationEnabled());
            data->setProperty("isActivated", false);
#else
            data->setProperty("isConfigured", false);
            data->setProperty("isActivated", false);
#endif
            webView->emitEventIfBrowserIsVisible("activationState", juce::var(data.get()));
        })
#if BEATCONNECT_ACTIVATION_ENABLED
        .withEventListener("activateLicense", [this](const juce::var& data) {
            handleActivateLicense(data);
        })
        .withEventListener("deactivateLicense", [this](const juce::var& data) {
            handleDeactivateLicense(data);
        })
#endif
        .withWinWebView2Options(
            juce::WebBrowserComponent::Options::WinWebView2()
                .withBackgroundColour(juce::Colour(0xFF0a0a0c))
                .withStatusBarDisabled()
                .withUserDataFolder(
                    juce::File::getSpecialLocation(juce::File::tempDirectory)
                        .getChildFile("OxideWebView2")));

    webView = std::make_unique<juce::WebBrowserComponent>(options);
    addAndMakeVisible(*webView);

#if OXIDE_DEV_MODE
    webView->goToURL("http://localhost:5173");
    DBG("Loading dev server at localhost:5173");
#else
    webView->goToURL(webView->getResourceProviderRoot());
    DBG("Loading from resource provider");
#endif
}

void OxideAudioProcessorEditor::VisualizerTimer::timerCallback()
{
    if (editor.webView == nullptr) return;

    juce::DynamicObject::Ptr data = new juce::DynamicObject();
    data->setProperty("rms", editor.processorRef.getCurrentRMS());
    data->setProperty("peak", editor.processorRef.getCurrentPeak());
    data->setProperty("wobblePhase", editor.processorRef.getWobblePhase());
    data->setProperty("crackleActivity", editor.processorRef.getCrackleActivity());
    data->setProperty("mode", editor.processorRef.getCurrentMode());
    data->setProperty("bypassed", editor.processorRef.isBypassed());
    data->setProperty("degradation", editor.processorRef.getDegradationAmount());

    editor.webView->emitEventIfBrowserIsVisible("visualizerData", juce::var(data.get()));
}

#if BEATCONNECT_ACTIVATION_ENABLED
void OxideAudioProcessorEditor::sendActivationState()
{
    auto* activation = processorRef.getActivation();
    if (activation == nullptr) return;

    juce::DynamicObject::Ptr data = new juce::DynamicObject();
    data->setProperty("isConfigured", activation->isConfigured());
    data->setProperty("isActivated", activation->isActivated());

    if (activation->isActivated())
    {
        auto info = activation->getActivationInfo();
        juce::DynamicObject::Ptr infoObj = new juce::DynamicObject();
        infoObj->setProperty("activationCode", juce::String(info.activationCode));
        infoObj->setProperty("machineId", juce::String(info.machineId));
        infoObj->setProperty("activatedAt", juce::String(info.activatedAt));
        infoObj->setProperty("currentActivations", info.currentActivations);
        infoObj->setProperty("maxActivations", info.maxActivations);
        infoObj->setProperty("isValid", info.isValid);
        data->setProperty("info", juce::var(infoObj.get()));
    }

    webView->emitEventIfBrowserIsVisible("activationState", juce::var(data.get()));
}

void OxideAudioProcessorEditor::handleActivateLicense(const juce::var& data)
{
    auto* activation = processorRef.getActivation();
    if (activation == nullptr) return;

    auto code = data.getProperty("code", "").toString().toStdString();

    activation->activate(code,
        [this](beatconnect::ActivationStatus status, const beatconnect::ActivationInfo& info) {
            juce::MessageManager::callAsync([this, status, info]() {
                juce::DynamicObject::Ptr result = new juce::DynamicObject();
                result->setProperty("status", juce::String(beatconnect::statusToString(status)));

                if (status == beatconnect::ActivationStatus::Valid)
                {
                    juce::DynamicObject::Ptr infoObj = new juce::DynamicObject();
                    infoObj->setProperty("activationCode", juce::String(info.activationCode));
                    infoObj->setProperty("machineId", juce::String(info.machineId));
                    infoObj->setProperty("activatedAt", juce::String(info.activatedAt));
                    infoObj->setProperty("currentActivations", info.currentActivations);
                    infoObj->setProperty("maxActivations", info.maxActivations);
                    infoObj->setProperty("isValid", info.isValid);
                    result->setProperty("info", juce::var(infoObj.get()));
                }

                webView->emitEventIfBrowserIsVisible("activationResult", juce::var(result.get()));
            });
        });
}

void OxideAudioProcessorEditor::handleDeactivateLicense(const juce::var&)
{
    auto* activation = processorRef.getActivation();
    if (activation == nullptr) return;

    activation->deactivate(
        [this](beatconnect::ActivationStatus status) {
            juce::MessageManager::callAsync([this, status]() {
                juce::DynamicObject::Ptr result = new juce::DynamicObject();
                result->setProperty("status", juce::String(beatconnect::statusToString(status)));
                webView->emitEventIfBrowserIsVisible("deactivationResult", juce::var(result.get()));
            });
        });
}

void OxideAudioProcessorEditor::handleGetActivationStatus()
{
    sendActivationState();
}
#endif

void OxideAudioProcessorEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour(0xff0a0a0c));
}

void OxideAudioProcessorEditor::resized()
{
    if (webView)
        webView->setBounds(getLocalBounds());
}
