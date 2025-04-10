/*
 * ESP8266 WiFi Connection Diagnostics Tool
 * 
 * This sketch performs comprehensive WiFi diagnostics on ESP8266, analyzing common connection issues.
 * It helps identify problems before attempting MQTT/TLS connections.
 */

#include <ESP8266WiFi.h>
#include <ESP8266Ping.h>
#include <DNSServer.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WebServer.h>

// WiFi credentials
const char* WIFI_SSID = "YOUR_SSID";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";

// Test destinations
const char* TEST_HOSTNAME = "mqtt.example.com"; // Replace with your MQTT broker hostname
const char* FALLBACK_HOST = "8.8.8.8"; // Google DNS as fallback
const int TEST_PORT = 8883; // Default MQTT TLS port

// Diagnostic settings
const int CONNECTION_TIMEOUT = 15000; // 15 seconds
const int PING_COUNT = 10;
const int SCAN_RETRY_COUNT = 3;
const int CONNECTION_RETRY_COUNT = 3;
const int RECONNECT_DELAY = 2000;

// Diagnostic results
struct DiagnosticResults {
  bool networkFound;
  int signalStrength;
  bool connectionSuccess;
  int connectionTime;
  bool internetAccess;
  float packetLoss;
  float avgRoundTrip;
  bool portReachable;
  bool dnsWorking;
  String localIP;
  String gatewayIP;
  String subnetMask;
  String dnsIP;
  int reconnectAttempts;
};

DiagnosticResults results;

void setup() {
  Serial.begin(115200);
  delay(2000); // Allow serial to initialize
  
  // Initialize diagnostic results
  resetDiagnosticResults();
  
  Serial.println("\n==== ESP8266 WiFi Diagnostics Tool ====");
  Serial.println("This tool will help diagnose WiFi connectivity issues");
  Serial.println("that may prevent MQTT/TLS connections from working properly.");
  
  // Print device information
  printDeviceInfo();
  
  // Run diagnostics
  runFullDiagnostics();
  
  // Print summary
  printDiagnosticSummary();
}

void loop() {
  // Provide menu of options
  Serial.println("\n=== Diagnostic Options ===");
  Serial.println("1: Re-run full diagnostics");
  Serial.println("2: Scan WiFi networks");
  Serial.println("3: Test connection stability (1 minute)");
  Serial.println("4: Ping test (detailed)");
  Serial.println("5: TCP port connection test");
  Serial.println("6: DNS resolution test");
  Serial.println("7: Run connection stress test");
  Serial.println("8: Print diagnostic summary");
  Serial.println("\nEnter option (1-8):");
  
  // Wait for user input
  while (!Serial.available()) {
    delay(100);
  }
  
  int option = Serial.parseInt();
  Serial.read(); // Clear buffer
  
  switch (option) {
    case 1:
      runFullDiagnostics();
      printDiagnosticSummary();
      break;
    case 2:
      scanWiFiNetworks();
      break;
    case 3:
      testConnectionStability();
      break;
    case 4:
      testPingDetailed();
      break;
    case 5:
      testTCPConnection();
      break;
    case 6:
      testDNSResolution();
      break;
    case 7:
      runConnectionStressTest();
      break;
    case 8:
      printDiagnosticSummary();
      break;
    default:
      Serial.println("Invalid option");
      break;
  }
}

void printDeviceInfo() {
  Serial.println("\n=== Device Information ===");
  Serial.print("ESP8266 Chip ID: 0x");
  Serial.println(ESP.getChipId(), HEX);
  Serial.print("Flash Chip ID: 0x");
  Serial.println(ESP.getFlashChipId(), HEX);
  Serial.print("Flash Chip Size: ");
  Serial.print(ESP.getFlashChipSize() / 1024);
  Serial.println(" KB");
  Serial.print("Free Heap: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" bytes");
  Serial.print("CPU Frequency: ");
  Serial.print(ESP.getCpuFreqMHz());
  Serial.println(" MHz");
  Serial.print("SDK Version: ");
  Serial.println(ESP.getSdkVersion());
  
  // Get MAC address
  Serial.print("MAC Address: ");
  Serial.println(WiFi.macAddress());
}

void runFullDiagnostics() {
  Serial.println("\n=== Running Full Diagnostics ===");
  
  // Reset diagnostic results
  resetDiagnosticResults();
  
  // Step 1: Scan for WiFi networks
  scanWiFiNetworks();
  
  // Step 2: Connect to WiFi
  testWiFiConnection();
  
  // Only continue tests if WiFi connected successfully
  if (results.connectionSuccess) {
    // Step 3: Test internet connectivity
    testInternetConnectivity();
    
    // Step 4: Test DNS resolution
    testDNSResolution();
    
    // Step 5: Test TCP connection to MQTT port
    testTCPConnection();
  }
}

void resetDiagnosticResults() {
  results.networkFound = false;
  results.signalStrength = -100; // Initial poor value
  results.connectionSuccess = false;
  results.connectionTime = 0;
  results.internetAccess = false;
  results.packetLoss = 100.0; // Initial poor value
  results.avgRoundTrip = 0;
  results.portReachable = false;
  results.dnsWorking = false;
  results.localIP = "0.0.0.0";
  results.gatewayIP = "0.0.0.0";
  results.subnetMask = "0.0.0.0";
  results.dnsIP = "0.0.0.0";
  results.reconnectAttempts = 0;
}

void scanWiFiNetworks() {
  Serial.println("\n=== Scanning WiFi Networks ===");
  
  results.networkFound = false;
  results.signalStrength = -100;
  
  // Disconnect if connected
  WiFi.disconnect();
  delay(100);
  
  // Scan for networks
  int scanAttempts = 0;
  int networksFound = 0;
  
  while (scanAttempts < SCAN_RETRY_COUNT && networksFound == 0) {
    scanAttempts++;
    
    Serial.print("Scan attempt ");
    Serial.print(scanAttempts);
    Serial.print("/");
    Serial.print(SCAN_RETRY_COUNT);
    Serial.print(": ");
    
    networksFound = WiFi.scanNetworks();
    
    if (networksFound == 0) {
      Serial.println("No networks found. Retrying...");
      delay(1000);
    } else {
      Serial.print(networksFound);
      Serial.println(" networks found!");
    }
  }
  
  if (networksFound == 0) {
    Serial.println("[FAIL] No WiFi networks found after multiple attempts");
    Serial.println("Possible causes:");
    Serial.println("  - WiFi router is powered off or too far away");
    Serial.println("  - Interference from other devices");
    Serial.println("  - ESP8266 WiFi hardware issue");
    return;
  }
  
  // Display networks and look for target network
  Serial.println("\nAvailable networks:");
  for (int i = 0; i < networksFound; i++) {
    // Print SSID and RSSI for each network found
    Serial.print(i + 1);
    Serial.print(": ");
    Serial.print(WiFi.SSID(i));
    Serial.print(" (");
    Serial.print(WiFi.RSSI(i));
    Serial.print(" dBm)");
    
    switch (WiFi.encryptionType(i)) {
      case ENC_TYPE_WEP:
        Serial.println(" [WEP]");
        break;
      case ENC_TYPE_TKIP:
        Serial.println(" [WPA-PSK]");
        break;
      case ENC_TYPE_CCMP:
        Serial.println(" [WPA2-PSK]");
        break;
      case ENC_TYPE_NONE:
        Serial.println(" [Open]");
        break;
      case ENC_TYPE_AUTO:
        Serial.println(" [Auto]");
        break;
      default:
        Serial.println(" [Unknown]");
        break;
    }
    
    // Check if this is our target network
    if (WiFi.SSID(i) == WIFI_SSID) {
      results.networkFound = true;
      results.signalStrength = WiFi.RSSI(i);
      
      Serial.print("[INFO] Target network '");
      Serial.print(WIFI_SSID);
      Serial.print("' found with signal strength: ");
      Serial.print(results.signalStrength);
      Serial.println(" dBm");
      
      // Signal strength assessment
      if (results.signalStrength >= -50) {
        Serial.println("[GOOD] Excellent signal strength (>= -50 dBm)");
      } else if (results.signalStrength >= -60) {
        Serial.println("[GOOD] Very good signal strength (-60 to -50 dBm)");
      } else if (results.signalStrength >= -70) {
        Serial.println("[OK] Good signal strength (-70 to -60 dBm)");
      } else if (results.signalStrength >= -80) {
        Serial.println("[WARN] Fair signal strength (-80 to -70 dBm)");
        Serial.println("      May cause occasional disconnections");
      } else {
        Serial.println("[FAIL] Poor signal strength (< -80 dBm)");
        Serial.println("      Likely to cause frequent disconnections");
      }
    }
  }
  
  if (!results.networkFound) {
    Serial.print("[FAIL] Target network '");
    Serial.print(WIFI_SSID);
    Serial.println("' not found");
    Serial.println("Possible causes:");
    Serial.println("  - SSID is incorrect (check for typos, case sensitivity)");
    Serial.println("  - WiFi router is not broadcasting SSID");
    Serial.println("  - WiFi router is too far away");
  }
  
  // Free memory used by the scan
  WiFi.scanDelete();
}

void testWiFiConnection() {
  Serial.println("\n=== Testing WiFi Connection ===");
  
  if (!results.networkFound) {
    Serial.println("[SKIP] Skipping connection test as network was not found");
    return;
  }
  
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
  bool connected = false;
  while (!connected && (millis() - startTime < CONNECTION_TIMEOUT)) {
    delay(500);
    Serial.print(".");
    connected = (WiFi.status() == WL_CONNECTED);
  }
  Serial.println();
  
  results.connectionTime = millis() - startTime;
  results.connectionSuccess = connected;
  
  if (connected) {
    results.localIP = WiFi.localIP().toString();
    results.gatewayIP = WiFi.gatewayIP().toString();
    results.subnetMask = WiFi.subnetMask().toString();
    results.dnsIP = WiFi.dnsIP().toString();
    
    Serial.println("[PASS] Successfully connected to WiFi");
    Serial.print("Connection time: ");
    Serial.print(results.connectionTime);
    Serial.println(" ms");
    
    if (results.connectionTime > 5000) {
      Serial.println("[WARN] Connection time is quite long");
      Serial.println("      This may indicate weak signal or interference");
    }
    
    Serial.println("\nConnection details:");
    Serial.print("  Local IP: ");
    Serial.println(results.localIP);
    Serial.print("  Gateway IP: ");
    Serial.println(results.gatewayIP);
    Serial.print("  Subnet Mask: ");
    Serial.println(results.subnetMask);
    Serial.print("  DNS Server: ");
    Serial.println(results.dnsIP);
    
    // Check if we got a valid IP (not 0.0.0.0)
    if (WiFi.localIP()[0] == 0) {
      Serial.println("[FAIL] Received invalid IP address (0.0.0.0)");
      Serial.println("      This suggests a DHCP server issue");
    }
  } else {
    Serial.println("[FAIL] Failed to connect to WiFi");
    
    // Print more detailed error information
    int status = WiFi.status();
    Serial.print("WiFi status code: ");
    Serial.print(status);
    
    switch (status) {
      case WL_NO_SSID_AVAIL:
        Serial.println(" (No SSID available)");
        Serial.println("Possible causes:");
        Serial.println("  - SSID is incorrect (check for typos, case sensitivity)");
        Serial.println("  - WiFi router is not broadcasting SSID");
        break;
      
      case WL_CONNECT_FAILED:
        Serial.println(" (Connection failed)");
        Serial.println("Possible causes:");
        Serial.println("  - Incorrect password");
        Serial.println("  - MAC address filtering on router");
        break;
      
      case WL_IDLE_STATUS:
        Serial.println(" (Idle status)");
        Serial.println("Possible causes:");
        Serial.println("  - WiFi is in the process of changing state");
        break;
      
      case WL_DISCONNECTED:
        Serial.println(" (Disconnected)");
        Serial.println("Possible causes:");
        Serial.println("  - Authentication problem");
        Serial.println("  - Router is rejecting the connection");
        break;
      
      default:
        Serial.println(" (Unknown error)");
        break;
    }
  }
}

void testInternetConnectivity() {
  Serial.println("\n=== Testing Internet Connectivity ===");
  
  if (!results.connectionSuccess) {
    Serial.println("[SKIP] Skipping internet test as WiFi is not connected");
    return;
  }
  
  // Test connectivity to the MQTT broker host
  Serial.print("Pinging ");
  Serial.print(TEST_HOSTNAME);
  Serial.print("... ");
  
  bool pingSuccess = false;
  IPAddress targetIP;
  
  // Try to resolve the hostname first
  if (WiFi.hostByName(TEST_HOSTNAME, targetIP)) {
    pingSuccess = Ping.ping(targetIP, PING_COUNT);
    Serial.println(targetIP.toString());
  } else {
    Serial.println("DNS resolution failed!");
    
    // Try the fallback host if broker host doesn't resolve
    Serial.print("Trying fallback host (");
    Serial.print(FALLBACK_HOST);
    Serial.print(")... ");
    
    if (WiFi.hostByName(FALLBACK_HOST, targetIP)) {
      pingSuccess = Ping.ping(targetIP, PING_COUNT);
      Serial.println(targetIP.toString());
    } else {
      Serial.println("Fallback DNS resolution failed!");
    }
  }
  
  results.internetAccess = pingSuccess;
  
  if (pingSuccess) {
    results.packetLoss = Ping.averageTime();
    results.avgRoundTrip = 100.0 - (Ping.packetsReceived() * 100.0 / PING_COUNT);
    
    Serial.println("[PASS] Internet connectivity test successful");
    Serial.print("Average round-trip time: ");
    Serial.print(results.avgRoundTrip);
    Serial.println(" ms");
    Serial.print("Packet loss: ");
    Serial.print(results.packetLoss);
    Serial.println("%");
    
    if (results.packetLoss > 0) {
      Serial.println("[WARN] Some packet loss detected");
      Serial.println("      This may indicate network congestion or interference");
    }
    
    if (results.avgRoundTrip > 200) {
      Serial.println("[WARN] High latency detected");
      Serial.println("      This may cause MQTT timeouts or delayed responses");
    }
  } else {
    Serial.println("[FAIL] Internet connectivity test failed");
    Serial.println("Possible causes:");
    Serial.println("  - No internet connection from the router");
    Serial.println("  - WiFi connection is local only");
    Serial.println("  - Router firewall blocking ICMP/ping packets");
    Serial.println("  - DNS resolution failed (if using hostname)");
  }
}

void testDNSResolution() {
  Serial.println("\n=== Testing DNS Resolution ===");
  
  if (!results.connectionSuccess) {
    Serial.println("[SKIP] Skipping DNS test as WiFi is not connected");
    return;
  }
  
  IPAddress targetIP;
  
  Serial.print("Resolving hostname '");
  Serial.print(TEST_HOSTNAME);
  Serial.print("'... ");
  
  results.dnsWorking = WiFi.hostByName(TEST_HOSTNAME, targetIP);
  
  if (results.dnsWorking) {
    Serial.print("Success: ");
    Serial.println(targetIP.toString());
  } else {
    Serial.println("Failed!");
    Serial.println("[FAIL] Unable to resolve hostname");
    Serial.println("Possible causes:");
    Serial.println("  - DNS server is not responding");
    Serial.println("  - DNS server address is incorrect");
    Serial.println("  - Host doesn't exist or is misspelled");
    Serial.println("  - Router or ESP8266 has DNS issues");
  }
  
  // Test additional common domains to verify DNS system
  Serial.println("\nTesting additional domains for DNS verification:");
  
  const char* testDomains[] = {"google.com", "amazon.com", "example.com"};
  int successCount = 0;
  
  for (int i = 0; i < 3; i++) {
    Serial.print("  Resolving '");
    Serial.print(testDomains[i]);
    Serial.print("'... ");
    
    if (WiFi.hostByName(testDomains[i], targetIP)) {
      Serial.print("Success: ");
      Serial.println(targetIP.toString());
      successCount++;
    } else {
      Serial.println("Failed!");
    }
  }
  
  Serial.print("DNS resolution test: ");
  Serial.print(successCount);
  Serial.println("/3 successful");
  
  if (successCount == 0) {
    Serial.println("[FAIL] DNS system not working at all");
    Serial.println("      MQTT connections using hostname will fail");
  } else if (successCount < 3) {
    Serial.println("[WARN] DNS system partially working");
    Serial.println("      Intermittent connection issues may occur");
  } else {
    Serial.println("[PASS] DNS system working normally");
  }
}

void testTCPConnection() {
  Serial.println("\n=== Testing TCP Connection to MQTT Port ===");
  
  if (!results.connectionSuccess) {
    Serial.println("[SKIP] Skipping TCP test as WiFi is not connected");
    return;
  }
  
  IPAddress targetIP;
  bool hostResolved = WiFi.hostByName(TEST_HOSTNAME, targetIP);
  
  if (!hostResolved) {
    Serial.println("[FAIL] Cannot resolve hostname to test TCP connection");
    Serial.println("      Try using IP address directly in your MQTT code");
    return;
  }
  
  WiFiClient client;
  
  Serial.print("Attempting TCP connection to ");
  Serial.print(TEST_HOSTNAME);
  Serial.print(" (");
  Serial.print(targetIP);
  Serial.print(") on port ");
  Serial.print(TEST_PORT);
  Serial.print("... ");
  
  unsigned long startTime = millis();
  bool connected = client.connect(targetIP, TEST_PORT);
  unsigned long connectionTime = millis() - startTime;
  
  results.portReachable = connected;
  
  if (connected) {
    Serial.println("Success!");
    Serial.print("Connection established in ");
    Serial.print(connectionTime);
    Serial.println(" ms");
    
    client.stop();
    Serial.println("[PASS] TCP port is accessible");
  } else {
    Serial.println("Failed!");
    Serial.println("[FAIL] Cannot connect to MQTT port");
    Serial.println("Possible causes:");
    Serial.println("  - MQTT broker is not running");
    Serial.println("  - Firewall blocking the port");
    Serial.println("  - Port number is incorrect");
    Serial.println("  - For TLS ports: Cannot establish non-TLS connection to TLS port");
    
    // Try alternative ports to see if any TCP connection works
    int altPorts[] = {80, 443, 1883};
    
    Serial.println("\nTesting alternative ports to check TCP connectivity:");
    bool anyPortWorks = false;
    
    for (int i = 0; i < 3; i++) {
      Serial.print("  Port ");
      Serial.print(altPorts[i]);
      Serial.print(": ");
      
      if (client.connect(targetIP, altPorts[i])) {
        Serial.println("Success!");
        client.stop();
        anyPortWorks = true;
      } else {
        Serial.println("Failed");
      }
    }
    
    if (anyPortWorks) {
      Serial.println("\n[INFO] Some TCP ports are accessible");
      Serial.println("      This suggests a specific MQTT port firewall issue");
    } else {
      Serial.println("\n[FAIL] All TCP connection attempts failed");
      Serial.println("      This suggests general TCP connectivity issues");
    }
  }
}

void testConnectionStability() {
  Serial.println("\n=== Testing Connection Stability (1 minute) ===");
  
  if (!WiFi.isConnected()) {
    Serial.println("Connecting to WiFi for stability test...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int timeout = 0;
    while (WiFi.status() != WL_CONNECTED && timeout < 20) {
      delay(500);
      Serial.print(".");
      timeout++;
    }
    Serial.println();
    
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[FAIL] Could not connect to WiFi for stability test");
      return;
    }
  }
  
  Serial.println("Monitoring connection for 60 seconds...");
  Serial.println("Time  | Status | RSSI | Ping");
  Serial.println("------|--------|------|------");
  
  unsigned long startTime = millis();
  int disconnections = 0;
  int pingFailures = 0;
  int pingAttempts = 0;
  
  // Test for 60 seconds (1 minute)
  while (millis() - startTime < 60000) {
    // Print current time
    int seconds = (millis() - startTime) / 1000;
    Serial.print(seconds);
    Serial.print("s");
    if (seconds < 10) Serial.print("  ");
    else Serial.print(" ");
    Serial.print("| ");
    
    // Check connection status
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("CONN   | ");
    } else {
      Serial.print("DISC   | ");
      disconnections++;
      
      // Try to reconnect
      WiFi.reconnect();
    }
    
    // Get signal strength
    int rssi = WiFi.RSSI();
    Serial.print(rssi);
    Serial.print(" | ");
    
    // Ping test (only if connected)
    if (WiFi.status() == WL_CONNECTED) {
      pingAttempts++;
      IPAddress googleDns(8, 8, 8, 8);
      
      if (Ping.ping(googleDns, 1)) {
        Serial.println("OK");
      } else {
        Serial.println("FAIL");
        pingFailures++;
      }
    } else {
      Serial.println("N/A");
    }
    
    // Wait 5 seconds between checks
    delay(5000);
  }
  
  Serial.println("\nStability Test Results:");
  Serial.print("Disconnections: ");
  Serial.println(disconnections);
  
  float pingLossRate = 0;
  if (pingAttempts > 0) {
    pingLossRate = (float)pingFailures / pingAttempts * 100.0;
  }
  
  Serial.print("Ping failures: ");
  Serial.print(pingFailures);
  Serial.print("/");
  Serial.print(pingAttempts);
  Serial.print(" (");
  Serial.print(pingLossRate);
  Serial.println("%)");
  
  if (disconnections == 0 && pingLossRate < 10) {
    Serial.println("[PASS] Connection is stable");
  } else if (disconnections <= 1 && pingLossRate < 20) {
    Serial.println("[WARN] Connection has minor stability issues");
    Serial.println("      May cause occasional MQTT disconnections");
  } else {
    Serial.println("[FAIL] Connection is unstable");
    Serial.println("      Will cause frequent MQTT reconnections");
    Serial.println("Possible causes:");
    Serial.println("  - WiFi signal is weak or inconsistent");
    Serial.println("  - Interference from other devices");
    Serial.println("  - Power supply issues with router or ESP8266");
    Serial.println("  - Router is overloaded or has issues");
  }
}

void testPingDetailed() {
  Serial.println("\n=== Detailed Ping Test ===");
  
  if (!WiFi.isConnected()) {
    Serial.println("[FAIL] Not connected to WiFi");
    return;
  }
  
  IPAddress targetIP;
  
  if (!WiFi.hostByName(TEST_HOSTNAME, targetIP)) {
    Serial.print("Cannot resolve '");
    Serial.print(TEST_HOSTNAME);
    Serial.print("', using fallback address (");
    Serial.print(FALLBACK_HOST);
    Serial.println(")");
    
    if (!WiFi.hostByName(FALLBACK_HOST, targetIP)) {
      Serial.println("[FAIL] Cannot resolve any hostnames");
      return;
    }
  }
  
  Serial.print("Pinging ");
  Serial.print(targetIP);
  Serial.println(" 20 times with detailed results:");
  
  int successCount = 0;
  int timeouts = 0;
  float minTime = 10000;
  float maxTime = 0;
  float avgTime = 0;
  float totalTime = 0;
  float jitter = 0;
  float prevTime = 0;
  float totalJitter = 0;
  
  for (int i = 0; i < 20; i++) {
    Serial.print("Ping #");
    Serial.print(i + 1);
    Serial.print(": ");
    
    if (Ping.ping(targetIP, 1)) {
      float pingTime = Ping.averageTime();
      
      Serial.print(pingTime);
      Serial.println(" ms");
      
      successCount++;
      totalTime += pingTime;
      
      if (pingTime < minTime) minTime = pingTime;
      if (pingTime > maxTime) maxTime = pingTime;
      
      if (i > 0) {
        float currentJitter = abs(pingTime - prevTime);
        totalJitter += currentJitter;
      }
      
      prevTime = pingTime;
    } else {
      Serial.println("Timeout");
      timeouts++;
    }
    
    delay(500);
  }
  
  if (successCount > 0) {
    avgTime = totalTime / successCount;
  }
  
  if (successCount > 1) {
    jitter = totalJitter / (successCount - 1);
  }
  
  Serial.println("\nPing Test Results:");
  Serial.print("Success rate: ");
  Serial.print(successCount);
  Serial.println("/20");
  Serial.print("Packet loss: ");
  Serial.print(timeouts * 5);
  Serial.println("%");
  
  if (successCount > 0) {
    Serial.print("Min time: ");
    Serial.print(minTime);
    Serial.println(" ms");
    Serial.print("Max time: ");
    Serial.print(maxTime);
    Serial.println(" ms");
    Serial.print("Avg time: ");
    Serial.print(avgTime);
    Serial.println(" ms");
    Serial.print("Jitter: ");
    Serial.print(jitter);
    Serial.println(" ms");
    
    if (timeouts == 0) {
      Serial.println("[PASS] All pings successful");
    } else if (timeouts <= 3) {
      Serial.println("[WARN] Some packet loss detected");
    } else {
      Serial.println("[FAIL] Significant packet loss detected");
    }
    
    if (avgTime > 200) {
      Serial.println("[WARN] High latency may affect MQTT performance");
    }
    
    if (jitter > 50) {
      Serial.println("[WARN] High jitter may cause inconsistent connection behavior");
    }
  } else {
    Serial.println("[FAIL] All pings failed");
  }
}

void runConnectionStressTest() {
  Serial.println("\n=== Connection Stress Test ===");
  Serial.println("This test will repeatedly disconnect and reconnect to WiFi");
  Serial.println("to test the robustness of your connection setup.");
  Serial.println("Test will perform 10 reconnection cycles...");
  
  int successCount = 0;
  unsigned long totalConnectTime = 0;
  unsigned long minConnectTime = 0xFFFFFFFF;
  unsigned long maxConnectTime = 0;
  
  for (int i = 0; i < 10; i++) {
    Serial.print("\nCycle ");
    Serial.print(i + 1);
    Serial.println("/10:");
    
    // Disconnect
    Serial.print("Disconnecting... ");
    WiFi.disconnect();
    delay(500);
    Serial.println("Done");
    
    // Reconnect with timing
    Serial.print("Connecting to ");
    Serial.print(WIFI_SSID);
    Serial.print("... ");
    
    unsigned long startTime = millis();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int timeout = 0;
    while (WiFi.status() != WL_CONNECTED && timeout < 30) {
      delay(500);
      timeout++;
    }
    
    unsigned long connectTime = millis() - startTime;
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("Connected in ");
      Serial.print(connectTime);
      Serial.println(" ms");
      
      successCount++;
      totalConnectTime += connectTime;
      
      if (connectTime < minConnectTime) minConnectTime = connectTime;
      if (connectTime > maxConnectTime) maxConnectTime = connectTime;
    } else {
      Serial.println("Failed!");
    }
    
    // Brief delay between cycles
    delay(1000);
  }
  
  // Calculate results
  Serial.println("\nStress Test Results:");
  Serial.print("Successful reconnections: ");
  Serial.print(successCount);
  Serial.println("/10");
  
  if (successCount > 0) {
    float avgConnectTime = totalConnectTime / successCount;
    
    Serial.print("Average connect time: ");
    Serial.print(avgConnectTime);
    Serial.println(" ms");
    Serial.print("Fastest connect: ");
    Serial.print(minConnectTime);
    Serial.println(" ms");
    Serial.print("Slowest connect: ");
    Serial.print(maxConnectTime);
    Serial.println(" ms");
    Serial.print("Connection time variability: ");
    Serial.print(maxConnectTime - minConnectTime);
    Serial.println(" ms");
  }
  
  if (successCount == 10) {
    Serial.println("[PASS] All reconnection attempts successful");
  } else if (successCount >= 8) {
    Serial.println("[WARN] Most reconnection attempts succeeded");
    Serial.println("      Occasional reconnection issues may occur");
  } else if (successCount >= 5) {
    Serial.println("[WARN] Only some reconnection attempts succeeded");
    Serial.println("      Expect frequent connection issues");
  } else {
    Serial.println("[FAIL] Connection is unreliable");
    Serial.println("      MQTT will have significant stability issues");
  }
  
  // Reconnect one last time
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nReconnecting to WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int timeout = 0;
    while (WiFi.status() != WL_CONNECTED && timeout < 20) {
      delay(500);
      Serial.print(".");
      timeout++;
    }
    Serial.println();
  }
}

void printDiagnosticSummary() {
  Serial.println("\n====== Diagnostic Summary ======");
  
  // Network scan results
  Serial.print("Target Network Found: ");
  Serial.println(results.networkFound ? "YES" : "NO");
  
  if (results.networkFound) {
    Serial.print("Signal Strength: ");
    Serial.print(results.signalStrength);
    Serial.println(" dBm");
    
    if (results.signalStrength >= -70) {
      Serial.println("Signal Quality: GOOD");
    } else if (results.signalStrength >= -80) {
      Serial.println("Signal Quality: FAIR (may cause issues)");
    } else {
      Serial.println("Signal Quality: POOR (likely to cause problems)");
    }
  }
  
  // Connection results
  Serial.print("WiFi Connection: ");
  Serial.println(results.connectionSuccess ? "SUCCESS" : "FAILED");
  
  if (results.connectionSuccess) {
    Serial.print("Local IP: ");
    Serial.println(results.localIP);
    
    Serial.print("Internet Access: ");
    Serial.println(results.internetAccess ? "YES" : "NO");
    
    Serial.print("DNS Resolution: ");
    Serial.println(results.dnsWorking ? "WORKING" : "FAILED");
    
    Serial.print("MQTT Port Access: ");
    Serial.println(results.portReachable ? "YES" : "NO");
  }
  
  // Overall assessment
  Serial.println("\nOverall Assessment:");
  
  if (!results.networkFound) {
    Serial.println("❌ CRITICAL: Cannot find target WiFi network");
    Serial.println("   Fix this first before attempting MQTT connections");
  } else if (!results.connectionSuccess) {
    Serial.println("❌ CRITICAL: Cannot connect to WiFi network");
    Serial.println("   Verify password and check router settings");
  } else if (!results.internetAccess) {
    Serial.println("❌ CRITICAL: No internet access");
    Serial.println("   Check router internet connection");
  } else if (!results.dnsWorking) {
    Serial.println("❌ MAJOR: DNS resolution failing");
    Serial.println("   Use IP address instead of hostname in MQTT config");
  } else if (!results.portReachable) {
    Serial.println("❌ MAJOR: Cannot connect to MQTT port");
    Serial.println("   Verify port number and check firewall settings");
  } else if (results.signalStrength < -80) {
    Serial.println("⚠️ WARNING: WiFi signal is weak");
    Serial.println("   Move device closer to router or use a WiFi extender");
    Serial.println("   MQTT connection may be unstable");
  } else {
    Serial.println("✅ GOOD: All basic connection tests passed");
    Serial.println("   MQTT connection should work if TLS is configured correctly");
  }
  
  Serial.println("\nNext Steps:");
  
  if (!results.connectionSuccess) {
    Serial.println("1. Fix WiFi connectivity issues before proceeding");
    Serial.println("2. Check WiFi credentials and router settings");
    Serial.println("3. Try moving the device closer to the router");
  } else if (!results.portReachable) {
    Serial.println("1. Verify MQTT broker address and port");
    Serial.println("2. Check if broker is running and accessible");
    Serial.println("3. Try using a different port if possible");
    Serial.println("4. Check firewall settings on the network");
  } else {
    Serial.println("1. Proceed with TLS configuration for MQTT");
    Serial.println("2. Verify certificate setup if using TLS");
    Serial.println("3. Use mqtt_tls_debug.ino to test MQTT with TLS");
  }
} 