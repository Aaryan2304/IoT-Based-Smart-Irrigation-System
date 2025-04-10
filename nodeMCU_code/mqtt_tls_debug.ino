/*
 * ESP8266 MQTT TLS Connection Diagnostics Tool
 * 
 * This sketch performs comprehensive tests on MQTT with TLS connectivity,
 * focusing on certificate validation and TLS handshake issues.
 */

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <time.h>

// WiFi credentials
const char* WIFI_SSID = "YOUR_SSID";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";

// MQTT settings
const char* MQTT_SERVER = "your-mqtt-server.com";
const int MQTT_PORT = 8883;
const char* MQTT_USERNAME = "your_username";
const char* MQTT_PASSWORD = "your_password";
const char* MQTT_CLIENT_ID = "ESP8266_TLS_Debug";
const char* MQTT_TEST_TOPIC = "tls_debug/test";

// NTP server for getting time (required for certificate validation)
const char* NTP_SERVER = "pool.ntp.org";

// Test settings
const int CONNECTION_TIMEOUT = 10000;  // 10 seconds
const int TLS_HANDSHAKE_TIMEOUT = 15000;  // 15 seconds
const int MQTT_CONNECT_TIMEOUT = 5000;  // 5 seconds
const int CERT_VALIDATION_TIMEOUT = 10000;  // 10 seconds

// WiFi network info
IPAddress local_IP(0, 0, 0, 0);
IPAddress gateway(0, 0, 0, 0);
IPAddress subnet(255, 255, 255, 0);
IPAddress primaryDNS(8, 8, 8, 8);

// Test results
struct TestResults {
  bool wifiConnected;
  bool ntpSynced;
  long currentTime;
  bool serverResolved;
  IPAddress serverIP;
  bool tlsConnected;
  bool certificateValid;
  bool mqttConnected;
  int tlsHandshakeTime;
  String lastError;
};

TestResults results;

// Certificate trust anchors - Root CA certificates
// Replace these with the certificates for your MQTT broker
// You can get Mozilla's root certificate bundle from https://github.com/esp8266/Arduino/blob/master/libraries/ESP8266WiFi/examples/BearSSL_CertStore/certs/roots.pem
// or use the specific certificate for your broker
static const char rootCA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
... [paste your full certificate here] ...
-----END CERTIFICATE-----
)EOF";

// Client certificate (if using mutual TLS)
// If your broker doesn't require client certificates, you can leave this empty
static const char clientCert[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
... [paste your client certificate here if needed] ...
-----END CERTIFICATE-----
)EOF";

// Client private key (if using mutual TLS)
// If your broker doesn't require client certificates, you can leave this empty
static const char clientKey[] PROGMEM = R"EOF(
-----BEGIN PRIVATE KEY-----
... [paste your client private key here if needed] ...
-----END PRIVATE KEY-----
)EOF";

// Initialize clients
WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

// Callback when receiving MQTT messages
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message received on topic: ");
  Serial.println(topic);
  
  Serial.print("Message content: ");
  for (unsigned int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(3000); // Wait for serial to initialize
  
  // Initialize results
  resetTestResults();
  
  Serial.println("\n==== ESP8266 MQTT TLS Connection Diagnostics Tool ====");
  Serial.println("This tool will help diagnose MQTT connectivity issues with TLS");
  
  // Run diagnostics
  runDiagnostics();
}

void loop() {
  // Provide menu options
  Serial.println("\n=== Diagnostic Options ===");
  Serial.println("1: Re-run full diagnostics");
  Serial.println("2: Test WiFi connection only");
  Serial.println("3: Test NTP sync only");
  Serial.println("4: Test TLS connection only");
  Serial.println("5: Test MQTT connection only");
  Serial.println("6: Run certificate validation test");
  Serial.println("7: Send test message (if connected)");
  Serial.println("8: Print diagnostic summary");
  Serial.println("\nEnter option (1-8):");
  
  while (!Serial.available()) {
    // Process MQTT messages if connected
    if (mqttClient.connected()) {
      mqttClient.loop();
    }
    delay(100);
  }
  
  int option = Serial.parseInt();
  Serial.read(); // Clear buffer
  
  switch (option) {
    case 1:
      runDiagnostics();
      break;
    case 2:
      testWiFiConnection();
      break;
    case 3:
      testNTPSync();
      break;
    case 4:
      testTLSConnection();
      break;
    case 5:
      testMQTTConnection();
      break;
    case 6:
      testCertificateValidation();
      break;
    case 7:
      sendTestMessage();
      break;
    case 8:
      printDiagnosticSummary();
      break;
    default:
      Serial.println("Invalid option");
      break;
  }
}

void resetTestResults() {
  results.wifiConnected = false;
  results.ntpSynced = false;
  results.currentTime = 0;
  results.serverResolved = false;
  results.serverIP = IPAddress(0, 0, 0, 0);
  results.tlsConnected = false;
  results.certificateValid = false;
  results.mqttConnected = false;
  results.tlsHandshakeTime = 0;
  results.lastError = "";
}

void runDiagnostics() {
  Serial.println("\n=== Running Full MQTT+TLS Diagnostics ===");
  
  // Reset test results
  resetTestResults();
  
  // Step 1: Connect to WiFi
  testWiFiConnection();
  
  // Only continue if WiFi is connected
  if (results.wifiConnected) {
    // Step 2: Sync time with NTP server
    testNTPSync();
    
    // Step 3: Test TLS connection
    testTLSConnection();
    
    // Step 4: Test certificate validation
    testCertificateValidation();
    
    // Step 5: Test MQTT connection
    testMQTTConnection();
  }
  
  // Print diagnostic summary
  printDiagnosticSummary();
}

void testWiFiConnection() {
  Serial.println("\n=== Testing WiFi Connection ===");
  
  // Disconnect if already connected
  WiFi.disconnect();
  delay(100);
  
  // Set WiFi mode to station
  WiFi.mode(WIFI_STA);
  
  // Attempt to connect with timeout
  Serial.print("Connecting to ");
  Serial.print(WIFI_SSID);
  Serial.print("...");
  
  unsigned long startTime = millis();
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // Try to connect with timeout
  while (WiFi.status() != WL_CONNECTED && (millis() - startTime < CONNECTION_TIMEOUT)) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  
  results.wifiConnected = (WiFi.status() == WL_CONNECTED);
  
  if (results.wifiConnected) {
    Serial.println("[PASS] Successfully connected to WiFi");
    Serial.print("Local IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[FAIL] Failed to connect to WiFi");
    results.lastError = "WiFi connection failed";
    
    // Print more detailed error information
    int status = WiFi.status();
    Serial.print("WiFi status code: ");
    Serial.println(status);
    
    switch (status) {
      case WL_NO_SSID_AVAIL:
        Serial.println("No SSID available");
        break;
      case WL_CONNECT_FAILED:
        Serial.println("Connection failed - check password");
        break;
      case WL_IDLE_STATUS:
        Serial.println("WiFi is in idle status");
        break;
      case WL_DISCONNECTED:
        Serial.println("Disconnected from network");
        break;
      default:
        Serial.println("Unknown error");
        break;
    }
  }
}

void testNTPSync() {
  Serial.println("\n=== Testing NTP Time Sync ===");
  
  if (!results.wifiConnected) {
    Serial.println("[SKIP] Skipping NTP test as WiFi is not connected");
    results.lastError = "Cannot sync time - WiFi not connected";
    return;
  }
  
  Serial.print("Setting time using NTP server: ");
  Serial.println(NTP_SERVER);
  
  // Set time via NTP, as required for certificate validation
  configTime(0, 0, NTP_SERVER);
  
  Serial.print("Waiting for NTP time sync");
  
  unsigned long startTime = millis();
  time_t now = 0;
  
  // Wait until NTP time is set or timeout
  while (now < 8 * 3600 * 2 && (millis() - startTime < CONNECTION_TIMEOUT)) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println();
  
  results.currentTime = now;
  results.ntpSynced = (now > 8 * 3600 * 2);
  
  if (results.ntpSynced) {
    Serial.println("[PASS] NTP time sync successful");
    Serial.print("Current timestamp: ");
    Serial.print(results.currentTime);
    
    // Format and print the time
    struct tm timeinfo;
    gmtime_r(&now, &timeinfo);
    Serial.print(" (UTC: ");
    Serial.print(timeinfo.tm_year + 1900);
    Serial.print("-");
    Serial.print(timeinfo.tm_mon + 1);
    Serial.print("-");
    Serial.print(timeinfo.tm_mday);
    Serial.print(" ");
    Serial.print(timeinfo.tm_hour);
    Serial.print(":");
    Serial.print(timeinfo.tm_min);
    Serial.print(":");
    Serial.print(timeinfo.tm_sec);
    Serial.println(")");
  } else {
    Serial.println("[FAIL] Failed to sync time with NTP server");
    Serial.println("Certificate validation will likely fail without correct time");
    Serial.println("Possible causes:");
    Serial.println("  - NTP server not accessible (firewall or connectivity issue)");
    Serial.println("  - DNS resolution failure for NTP server");
    results.lastError = "NTP time sync failed";
  }
}

void testTLSConnection() {
  Serial.println("\n=== Testing TLS Connection ===");
  
  if (!results.wifiConnected) {
    Serial.println("[SKIP] Skipping TLS test as WiFi is not connected");
    results.lastError = "Cannot test TLS - WiFi not connected";
    return;
  }
  
  // First try to resolve the server hostname
  Serial.print("Resolving hostname: ");
  Serial.print(MQTT_SERVER);
  Serial.print("... ");
  
  IPAddress serverIP;
  results.serverResolved = WiFi.hostByName(MQTT_SERVER, serverIP);
  
  if (results.serverResolved) {
    results.serverIP = serverIP;
    Serial.print("Success: ");
    Serial.println(serverIP.toString());
  } else {
    Serial.println("Failed!");
    Serial.println("[FAIL] Unable to resolve MQTT server hostname");
    Serial.println("Possible causes:");
    Serial.println("  - DNS server not configured properly");
    Serial.println("  - MQTT server hostname is incorrect");
    Serial.println("  - DNS resolution failure");
    results.lastError = "DNS resolution failed for MQTT server";
    return;
  }
  
  // Now test the TLS connection
  Serial.print("Testing TLS connection to ");
  Serial.print(MQTT_SERVER);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.print("... ");
  
  // Setup TLS certificates
  setupTLSCertificates();
  
  // Set client timeout
  wifiClient.setTimeout(TLS_HANDSHAKE_TIMEOUT / 1000); // setTimeout uses seconds
  
  // Try to connect with timeout and measure time
  unsigned long startTime = millis();
  
  bool connected = wifiClient.connect(MQTT_SERVER, MQTT_PORT);
  
  results.tlsHandshakeTime = millis() - startTime;
  results.tlsConnected = connected;
  
  if (results.tlsConnected) {
    Serial.println("Success!");
    Serial.print("TLS handshake completed in ");
    Serial.print(results.tlsHandshakeTime);
    Serial.println(" ms");
    
    // Test if certificate is valid
    testCertificateValidation();
  } else {
    Serial.println("Failed!");
    Serial.println("[FAIL] TLS connection failed");
    Serial.println("Possible causes:");
    Serial.println("  - Server not running or wrong port");
    Serial.println("  - Certificate validation failed");
    Serial.println("  - Firewall blocking connection");
    Serial.println("  - MQTT broker doesn't support TLS");
    Serial.println("  - Wrong certificate or server doesn't have valid certificate");
    
    results.lastError = wifiClient.getLastSSLError(true);
    Serial.print("SSL Error: ");
    Serial.println(results.lastError);
    
    // Display more information about the error
    int sslError = wifiClient.getLastSSLError();
    Serial.print("SSL Error Code: ");
    Serial.println(sslError);
    
    // Try to provide more specific guidance based on the error
    if (sslError == 0x1000) {
      Serial.println("Likely cause: Certificate validation failed - check your root CA certificate");
    } else if (sslError == 0x2000) {
      Serial.println("Likely cause: Hostname verification failed - certificate doesn't match hostname");
    } else if (sslError == 0x4000) {
      Serial.println("Likely cause: Certificate expired or not yet valid - check NTP time sync");
    }
  }
  
  // Close the connection
  wifiClient.stop();
}

void testCertificateValidation() {
  Serial.println("\n=== Testing Certificate Validation ===");
  
  if (!results.wifiConnected) {
    Serial.println("[SKIP] Skipping certificate validation as WiFi is not connected");
    results.lastError = "Cannot test certificate validation - WiFi not connected";
    return;
  }
  
  if (!results.ntpSynced) {
    Serial.println("[WARN] NTP time not synced - certificate validation may fail due to incorrect time");
  }
  
  // Setup TLS certificates
  setupTLSCertificates();
  
  // Set verification mode
  wifiClient.setInsecure(); // First try insecure to test basic connectivity
  
  Serial.println("Step 1: Testing connection without certificate verification...");
  
  bool insecureConnected = wifiClient.connect(MQTT_SERVER, MQTT_PORT);
  
  if (insecureConnected) {
    Serial.println("[PASS] Connection without verification successful");
    wifiClient.stop();
  } else {
    Serial.println("[FAIL] Connection without verification failed");
    Serial.println("This suggests a basic connectivity issue, not certificate-specific");
    results.lastError = "Basic TLS connection failed";
    return;
  }
  
  // Now try with certificate verification
  Serial.println("\nStep 2: Testing connection with certificate verification...");
  
  // Set up secure connection using root CA
  wifiClient.setBufferSizes(1024, 1024);
  wifiClient.setTrustAnchors(new BearSSL::X509List(rootCA));
  
  // If using client certificates (mutual TLS)
  if (strlen_P((PGM_P)clientCert) > 100 && strlen_P((PGM_P)clientKey) > 100) {
    Serial.println("Setting up client certificate for mutual TLS...");
    wifiClient.setClientRSACert(new BearSSL::X509List(clientCert), new BearSSL::PrivateKey(clientKey));
  }
  
  // Set time for certificate validation
  wifiClient.setX509Time(time(nullptr));
  
  // Try to connect with certificate validation
  unsigned long startTime = millis();
  
  bool secureConnected = wifiClient.connect(MQTT_SERVER, MQTT_PORT);
  
  unsigned long validationTime = millis() - startTime;
  results.certificateValid = secureConnected;
  
  if (results.certificateValid) {
    Serial.println("[PASS] Certificate validation successful");
    Serial.print("Validation completed in ");
    Serial.print(validationTime);
    Serial.println(" ms");
  } else {
    Serial.println("[FAIL] Certificate validation failed");
    Serial.println("Possible causes:");
    Serial.println("  - The server's certificate is not trusted");
    Serial.println("  - Incorrect root CA certificate");
    Serial.println("  - Certificate has expired or is not yet valid");
    Serial.println("  - Incorrect system time");
    
    results.lastError = wifiClient.getLastSSLError(true);
    Serial.print("SSL Error: ");
    Serial.println(results.lastError);
  }
  
  // Close the connection
  wifiClient.stop();
}

void testMQTTConnection() {
  Serial.println("\n=== Testing MQTT Connection ===");
  
  if (!results.wifiConnected) {
    Serial.println("[SKIP] Skipping MQTT test as WiFi is not connected");
    results.lastError = "Cannot test MQTT - WiFi not connected";
    return;
  }
  
  // Setup TLS certificates
  setupTLSCertificates();
  
  // Set the MQTT server and callback
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  
  Serial.print("Connecting to MQTT broker at ");
  Serial.print(MQTT_SERVER);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.print("... ");
  
  // Connect to MQTT broker with credentials
  unsigned long startTime = millis();
  
  bool connected = mqttClient.connect(
    MQTT_CLIENT_ID,
    MQTT_USERNAME,
    MQTT_PASSWORD
  );
  
  unsigned long connectTime = millis() - startTime;
  results.mqttConnected = connected;
  
  if (results.mqttConnected) {
    Serial.println("Success!");
    Serial.print("MQTT connection established in ");
    Serial.print(connectTime);
    Serial.println(" ms");
    
    // Subscribe to a test topic
    Serial.print("Subscribing to test topic: ");
    Serial.print(MQTT_TEST_TOPIC);
    Serial.print("... ");
    
    if (mqttClient.subscribe(MQTT_TEST_TOPIC)) {
      Serial.println("Success!");
    } else {
      Serial.println("Failed!");
      Serial.println("[WARN] MQTT subscription failed");
      Serial.println("Connected but may have limited permissions");
    }
    
    // Send a test message
    sendTestMessage();
  } else {
    Serial.println("Failed!");
    Serial.println("[FAIL] MQTT connection failed");
    
    // Get MQTT client error
    int mqttError = mqttClient.state();
    Serial.print("MQTT error code: ");
    Serial.print(mqttError);
    Serial.print(" - ");
    
    switch (mqttError) {
      case -4:
        Serial.println("MQTT_CONNECTION_TIMEOUT - the server didn't respond within the keepalive time");
        break;
      case -3:
        Serial.println("MQTT_CONNECTION_LOST - the network connection was broken");
        break;
      case -2:
        Serial.println("MQTT_CONNECT_FAILED - the network connection failed");
        break;
      case -1:
        Serial.println("MQTT_DISCONNECTED - the client is disconnected");
        break;
      case 1:
        Serial.println("MQTT_CONNECT_BAD_PROTOCOL - the server doesn't support the requested version of MQTT");
        break;
      case 2:
        Serial.println("MQTT_CONNECT_BAD_CLIENT_ID - the server rejected the client identifier");
        break;
      case 3:
        Serial.println("MQTT_CONNECT_UNAVAILABLE - the server was unable to accept the connection");
        break;
      case 4:
        Serial.println("MQTT_CONNECT_BAD_CREDENTIALS - the username/password were rejected");
        break;
      case 5:
        Serial.println("MQTT_CONNECT_UNAUTHORIZED - the client was not authorized to connect");
        break;
      default:
        Serial.println("Unknown error");
        break;
    }
    
    results.lastError = "MQTT connection failed with code " + String(mqttError);
    
    Serial.println("Possible causes:");
    Serial.println("  - Incorrect MQTT credentials (username/password)");
    Serial.println("  - MQTT broker not accepting connections");
    Serial.println("  - TLS handshake issues (certificate problems)");
    Serial.println("  - Incorrect client ID");
    Serial.println("  - Firewall or network issues");
  }
}

void sendTestMessage() {
  if (!mqttClient.connected()) {
    Serial.println("[FAIL] Cannot send test message - MQTT not connected");
    return;
  }
  
  Serial.print("Sending test message to topic ");
  Serial.print(MQTT_TEST_TOPIC);
  Serial.print("... ");
  
  // Create a test message with timestamp
  char message[100];
  sprintf(message, "ESP8266 MQTT TLS Test Message at %ld", time(nullptr));
  
  if (mqttClient.publish(MQTT_TEST_TOPIC, message)) {
    Serial.println("Success!");
    Serial.println("Message: ");
    Serial.println(message);
  } else {
    Serial.println("Failed!");
    Serial.println("[FAIL] Failed to publish MQTT message");
    Serial.println("Possible causes:");
    Serial.println("  - Topic permissions");
    Serial.println("  - Connection dropped");
    Serial.println("  - Buffer too small for message");
  }
}

void setupTLSCertificates() {
  // Reset client before setting certificates
  wifiClient.stop();
  
  // Set the root CA certificate
  BearSSL::X509List *rootCAList = new BearSSL::X509List(rootCA);
  wifiClient.setTrustAnchors(rootCAList);
  
  // If using client certificates (mutual TLS)
  if (strlen_P((PGM_P)clientCert) > 100 && strlen_P((PGM_P)clientKey) > 100) {
    BearSSL::X509List *clientCertList = new BearSSL::X509List(clientCert);
    BearSSL::PrivateKey *clientKeyList = new BearSSL::PrivateKey(clientKey);
    wifiClient.setClientRSACert(clientCertList, clientKeyList);
  }
  
  // Set time for certificate validation
  wifiClient.setX509Time(time(nullptr));
}

void printDiagnosticSummary() {
  Serial.println("\n====== MQTT TLS Diagnostic Summary ======");
  
  // WiFi connection
  Serial.print("WiFi Connection: ");
  Serial.println(results.wifiConnected ? "CONNECTED" : "DISCONNECTED");
  
  // NTP sync
  Serial.print("NTP Time Sync: ");
  Serial.println(results.ntpSynced ? "SYNCHRONIZED" : "FAILED");
  
  // Host resolution
  Serial.print("MQTT Server Resolution: ");
  if (results.serverResolved) {
    Serial.print("SUCCESS (");
    Serial.print(MQTT_SERVER);
    Serial.print(" -> ");
    Serial.print(results.serverIP);
    Serial.println(")");
  } else {
    Serial.println("FAILED");
  }
  
  // TLS connection
  Serial.print("TLS Connection: ");
  Serial.println(results.tlsConnected ? "SUCCESS" : "FAILED");
  
  if (results.tlsConnected) {
    Serial.print("TLS Handshake Time: ");
    Serial.print(results.tlsHandshakeTime);
    Serial.println(" ms");
  }
  
  // Certificate validation
  Serial.print("Certificate Validation: ");
  Serial.println(results.certificateValid ? "VALID" : "INVALID");
  
  // MQTT connection
  Serial.print("MQTT Connection: ");
  Serial.println(results.mqttConnected ? "CONNECTED" : "DISCONNECTED");
  
  // Last error
  if (results.lastError.length() > 0) {
    Serial.print("Last Error: ");
    Serial.println(results.lastError);
  }
  
  // Overall assessment
  Serial.println("\nOverall Assessment:");
  
  if (!results.wifiConnected) {
    Serial.println("❌ CRITICAL: Cannot connect to WiFi network");
    Serial.println("   Fix this first before proceeding with MQTT/TLS troubleshooting");
  } else if (!results.ntpSynced) {
    Serial.println("❌ CRITICAL: NTP time sync failed");
    Serial.println("   Certificate validation will fail without correct time");
  } else if (!results.serverResolved) {
    Serial.println("❌ CRITICAL: Cannot resolve MQTT server hostname");
    Serial.println("   Check DNS settings and server name");
  } else if (!results.tlsConnected) {
    Serial.println("❌ CRITICAL: TLS connection failed");
    Serial.println("   Check server address, port, and certificate setup");
  } else if (!results.certificateValid) {
    Serial.println("❌ MAJOR: Certificate validation failed");
    Serial.println("   Check root CA certificate and server certificate");
  } else if (!results.mqttConnected) {
    Serial.println("❌ MAJOR: MQTT connection failed");
    Serial.println("   Check MQTT credentials and broker configuration");
  } else {
    Serial.println("✅ GOOD: All MQTT+TLS tests passed");
    Serial.println("   MQTT with TLS is working correctly");
  }
  
  // Recommendations
  Serial.println("\nRecommendations:");
  
  if (!results.wifiConnected) {
    Serial.println("1. Fix WiFi connectivity issues first");
    Serial.println("2. Use the wifi_diagnostics.ino sketch for detailed WiFi troubleshooting");
  } else if (!results.ntpSynced) {
    Serial.println("1. Check NTP server accessibility");
    Serial.println("2. Verify DNS settings to resolve NTP server");
    Serial.println("3. Check if firewall is blocking NTP (UDP port 123)");
  } else if (!results.tlsConnected || !results.certificateValid) {
    Serial.println("1. Verify Root CA certificate is correct for your broker");
    Serial.println("2. Check if broker hostname matches certificate's CN/SAN");
    Serial.println("3. Ensure system time is correctly set for certificate validation");
    Serial.println("4. If using self-signed certificates, make sure you've added them as trusted");
  } else if (!results.mqttConnected) {
    Serial.println("1. Verify MQTT username and password");
    Serial.println("2. Check client ID for uniqueness and broker restrictions");
    Serial.println("3. Ensure the broker accepts connections and has capacity");
  } else {
    Serial.println("1. Your MQTT+TLS setup is working correctly!");
    Serial.println("2. Move forward with implementing your application logic");
  }
} 