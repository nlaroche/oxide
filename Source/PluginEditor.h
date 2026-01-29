#pragma once

#include "PluginProcessor.h"
#include <juce_gui_extra/juce_gui_extra.h>

class OxideAudioProcessorEditor : public juce::AudioProcessorEditor
{
public:
    explicit OxideAudioProcessorEditor(OxideAudioProcessor&);
    ~OxideAudioProcessorEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    void setupWebView();
    void handleWebMessage(const juce::var& message);

#if BEATCONNECT_ACTIVATION_ENABLED
    void sendActivationState();
    void handleActivateLicense(const juce::var& data);
    void handleDeactivateLicense(const juce::var& data);
    void handleGetActivationStatus();
#endif

    OxideAudioProcessor& processorRef;

    // Parameter relays for bidirectional sync
    std::unique_ptr<juce::WebSliderRelay> bitcrushRelay;
    std::unique_ptr<juce::WebSliderRelay> downsampleRelay;
    std::unique_ptr<juce::WebSliderRelay> noiseRelay;
    std::unique_ptr<juce::WebSliderRelay> crackleRelay;
    std::unique_ptr<juce::WebSliderRelay> wobbleRelay;
    std::unique_ptr<juce::WebSliderRelay> dropoutRelay;
    std::unique_ptr<juce::WebSliderRelay> saturationRelay;
    std::unique_ptr<juce::WebSliderRelay> ageRelay;
    std::unique_ptr<juce::WebSliderRelay> filterCutoffRelay;
    std::unique_ptr<juce::WebSliderRelay> filterResRelay;
    std::unique_ptr<juce::WebSliderRelay> filterDriveRelay;
    std::unique_ptr<juce::WebSliderRelay> modeRelay;
    std::unique_ptr<juce::WebSliderRelay> mixRelay;
    std::unique_ptr<juce::WebSliderRelay> outputRelay;
    std::unique_ptr<juce::WebToggleButtonRelay> bypassRelay;

    // Parameter attachments
    std::unique_ptr<juce::WebSliderParameterAttachment> bitcrushAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> downsampleAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> noiseAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> crackleAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> wobbleAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> dropoutAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> saturationAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> ageAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> filterCutoffAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> filterResAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> filterDriveAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> modeAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> mixAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> outputAttachment;
    std::unique_ptr<juce::WebToggleButtonParameterAttachment> bypassAttachment;

    std::unique_ptr<juce::WebBrowserComponent> webView;
    juce::File resourcesDir_;

    // Timer for visualizer updates
    class VisualizerTimer : public juce::Timer
    {
    public:
        VisualizerTimer(OxideAudioProcessorEditor& e) : editor(e) {}
        void timerCallback() override;
    private:
        OxideAudioProcessorEditor& editor;
    };
    VisualizerTimer visualizerTimer { *this };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OxideAudioProcessorEditor)
};
