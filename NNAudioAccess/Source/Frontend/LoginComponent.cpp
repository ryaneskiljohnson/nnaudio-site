#include "LoginComponent.h"

namespace NNAudio {

LoginComponent::LoginComponent(AuthManager& auth)
    : authManager(auth)
    , backgroundImage(juce::ImageCache::getFromMemory(BinaryData::background_03_png, 
                                                     BinaryData::background_03_pngSize))
    , logoImage(juce::ImageCache::getFromMemory(BinaryData::logo_png, 
                                               BinaryData::logo_pngSize))
    , forgotPasswordLink("Forgot Password?", juce::URL("https://nnaud.io/password-reset/"))
{
    // Email/Username field
    emailLabel.setText("Email or Username", juce::dontSendNotification);
    emailLabel.setFont(juce::Font(16.0f));
    emailLabel.setColour(juce::Label::textColourId, juce::Colours::white);
    addAndMakeVisible(emailLabel);
    
    emailField.setTextToShowWhenEmpty("Enter your email or username", juce::Colours::grey);
    emailField.setColour(juce::TextEditor::backgroundColourId, juce::Colour(0xFF2D2D2D));
    emailField.setColour(juce::TextEditor::textColourId, juce::Colours::white);
    emailField.setColour(juce::TextEditor::outlineColourId, juce::Colour(0xFF3D3D3D));
    emailField.setColour(juce::TextEditor::focusedOutlineColourId, juce::Colours::lightblue);
    emailField.setFont(juce::Font(16.0f));
    emailField.setJustification(juce::Justification::centredLeft);
    emailField.setIndents(10, (emailField.getHeight() - emailField.getFont().getHeight()) / 2);  // Horizontal and vertical padding
    emailField.addListener(this);
    addAndMakeVisible(emailField);
    
    // Password field
    passwordLabel.setText("Password", juce::dontSendNotification);
    passwordLabel.setFont(juce::Font(16.0f));
    passwordLabel.setColour(juce::Label::textColourId, juce::Colours::white);
    addAndMakeVisible(passwordLabel);
    
    passwordField.setTextToShowWhenEmpty("Enter your password", juce::Colours::grey);
    passwordField.setColour(juce::TextEditor::backgroundColourId, juce::Colour(0xFF2D2D2D));
    passwordField.setColour(juce::TextEditor::textColourId, juce::Colours::white);
    passwordField.setColour(juce::TextEditor::outlineColourId, juce::Colour(0xFF3D3D3D));
    passwordField.setColour(juce::TextEditor::focusedOutlineColourId, juce::Colours::lightblue);
    passwordField.setFont(juce::Font(16.0f));
    passwordField.setPasswordCharacter((juce::juce_wchar)'*');
    passwordField.setJustification(juce::Justification::centredLeft);
    passwordField.setIndents(10, (passwordField.getHeight() - passwordField.getFont().getHeight()) / 2);  // Horizontal and vertical padding
    passwordField.addListener(this);
    addAndMakeVisible(passwordField);
    
    // Remember Me toggle
    rememberMeToggle.setButtonText("Remember Me");
    rememberMeToggle.setColour(juce::ToggleButton::textColourId, juce::Colours::white);
    rememberMeToggle.setToggleState(true, juce::dontSendNotification);  // Set checked by default
    getLookAndFeel().setDefaultSansSerifTypefaceName("Arial");  // Ensure consistent font family
    addAndMakeVisible(rememberMeToggle);
    
    // Forgot Password link
    forgotPasswordLink.setButtonText("Forgot Password?");
    forgotPasswordLink.setFont(juce::Font(16.0f), false);
    forgotPasswordLink.setColour(juce::HyperlinkButton::textColourId, juce::Colours::lightblue);
    forgotPasswordLink.onClick = [this] { handleForgotPasswordClick(); };
    addAndMakeVisible(forgotPasswordLink);
    
    // Login button
    loginButton.setButtonText("Login");
    loginButton.setColour(juce::TextButton::buttonColourId, juce::Colour(0xFF1976D2));
    loginButton.setColour(juce::TextButton::buttonOnColourId, juce::Colour(0xFF9B4E0F));
    loginButton.setColour(juce::TextButton::textColourOffId, juce::Colours::white);
    loginButton.onClick = [this] { handleLoginClick(); };
    addAndMakeVisible(loginButton);
    
    // Status label
    statusLabel.setColour(juce::Label::textColourId, juce::Colours::white);
    statusLabel.setJustificationType(juce::Justification::centred);
    statusLabel.setFont(juce::Font(14.0f));
    addAndMakeVisible(statusLabel);
    
    // Register for authentication callbacks
    authManager.setAuthenticationCallback([this](bool success, const juce::String& message) {
        handleAuthenticationCallback(success, message);
    });
}

LoginComponent::~LoginComponent()
{
    authManager.setAuthenticationCallback(nullptr);
}

void LoginComponent::paint(juce::Graphics& g)
{
    // Fill background with solid black
    g.fillAll(juce::Colours::black);
    
    // Draw background image
    if (backgroundImage.isValid())
    {
        g.setOpacity(0.4f);  // Dim the background
        g.drawImage(backgroundImage, getLocalBounds().toFloat(),
                   juce::RectanglePlacement::fillDestination);
        g.setOpacity(1.0f);
    }
    
    // Draw logo
    if (logoImage.isValid())
    {
        const float logoHeight = 60.0f;
        const float logoWidth = (logoImage.getWidth() * logoHeight) / logoImage.getHeight();
        const float logoY = 30.0f;  // Fixed position from top
        const float logoX = (getWidth() - logoWidth) * 0.5f;
        
        g.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight,
                   0, 0, logoImage.getWidth(), logoImage.getHeight());
    }
}

void LoginComponent::setupTextFields()
{
    // Email field setup
    emailField.setJustification(juce::Justification::centredLeft);
    int emailVerticalIndent = (emailField.getHeight() - emailField.getFont().getHeight()) / 2 - 10;  // Move up 10px
    emailField.setIndents(10, emailVerticalIndent);

    // Password field setup
    passwordField.setJustification(juce::Justification::centredLeft);
    int passwordVerticalIndent = (passwordField.getHeight() - passwordField.getFont().getHeight()) / 2 - 10;  // Move up 10px
    passwordField.setIndents(10, passwordVerticalIndent);
}

void LoginComponent::resized()
{
    auto bounds = getLocalBounds().reduced(30);
    const int labelHeight = 20;
    const int fieldHeight = 35;
    const int spacing = 10;
    
    // Skip logo area
    bounds.removeFromTop(80);
    
    // Email section
    emailLabel.setBounds(bounds.removeFromTop(labelHeight));
    bounds.removeFromTop(3);
    emailField.setBounds(bounds.removeFromTop(fieldHeight));
    
    bounds.removeFromTop(spacing);
    
    // Password section
    passwordLabel.setBounds(bounds.removeFromTop(labelHeight));
    bounds.removeFromTop(3);
    passwordField.setBounds(bounds.removeFromTop(fieldHeight));
    
    bounds.removeFromTop(spacing);
    
    // Remember Me and Forgot Password row
    auto optionsRow = bounds.removeFromTop(labelHeight);
    rememberMeToggle.setBounds(optionsRow.removeFromLeft(120));
    forgotPasswordLink.setBounds(optionsRow.removeFromRight(120));
    
    bounds.removeFromTop(spacing * 1.5f);
    
    // Login button
    loginButton.setBounds(bounds.removeFromTop(fieldHeight).withSizeKeepingCentre(180, fieldHeight));
    
    bounds.removeFromTop(spacing * 0.5f);
    
    // Status label
    statusLabel.setBounds(bounds.removeFromTop(labelHeight));

    // Setup text fields after bounds are set
    setupTextFields();
}

void LoginComponent::handleLoginClick()
{
    auto email = emailField.getText();
    auto password = passwordField.getText();
    
    if (email.isEmpty() || password.isEmpty())
    {
        statusLabel.setText("Please enter both email/username and password", juce::dontSendNotification);
        return;
    }
    
    statusLabel.setText("Logging in...", juce::dontSendNotification);
    loginButton.setEnabled(false);
    
    authManager.authenticate(email, password, rememberMeToggle.getToggleState());
}

void LoginComponent::handleAuthenticationCallback(bool success, const juce::String& message)
{
    // Ensure we're on the message thread
    if (!juce::MessageManager::getInstance()->isThisTheMessageThread())
    {
        juce::MessageManager::callAsync([this, success, message]() {
            handleAuthenticationCallback(success, message);
        });
        return;
    }

    if (success)
    {
        statusLabel.setText("Login successful!", juce::dontSendNotification);
    }
    else
    {
        statusLabel.setText("Login failed: " + message, juce::dontSendNotification);
        loginButton.setEnabled(true);
        passwordField.clear();
    }
}

void LoginComponent::handleForgotPasswordClick()
{
    // The URL handling is now done by the HyperlinkButton automatically
}

void LoginComponent::textEditorReturnKeyPressed(juce::TextEditor&)
{
    handleLoginClick();
}

void LoginComponent::resetForm()
{
    passwordField.clear();
    loginButton.setEnabled(true);
    statusLabel.setText("", juce::dontSendNotification);
}

} // namespace NNAudio