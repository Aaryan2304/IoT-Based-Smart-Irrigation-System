/*
 * Soil Moisture Sensor Anomaly Detection Debug Tool
 * 
 * This sketch helps detect and troubleshoot anomalies in soil moisture sensor readings.
 * It performs statistical analysis on readings to identify noise, drift, and other common issues.
 */

#define ANALOG_PIN A0      // Soil moisture sensor analog pin
#define POWER_PIN D5       // Optional digital pin to power sensor (prevents corrosion)
#define LED_PIN LED_BUILTIN // Indicator LED

// Sample collection settings
const int SAMPLE_INTERVAL = 500;     // Time between samples in ms
const int NUM_SAMPLES = 100;         // Number of samples to collect in each batch
const int NUM_BATCHES = 10;          // Number of batches to collect
const int BATCH_DELAY = 2000;        // Delay between batches in ms

// Analysis thresholds - adjust based on your sensor characteristics
const int NOISE_THRESHOLD = 10;      // Acceptable variation between consecutive readings
const int DRIFT_THRESHOLD = 25;      // Acceptable drift over time
const int MAX_READING = 1023;        // Maximum analog reading
const int MIN_READING = 0;           // Minimum analog reading
const int EXPECTED_DRY_MIN = 900;    // Expected minimum reading for dry soil
const int EXPECTED_WET_MAX = 300;    // Expected maximum reading for wet soil

// Arrays to store readings
int samples[NUM_SAMPLES];
int batchAverages[NUM_BATCHES];
int batchMinValues[NUM_BATCHES];
int batchMaxValues[NUM_BATCHES];
int batchStdDevValues[NUM_BATCHES];

// Function prototypes
void collectSamples();
void analyzeSamples();
void printAnalysisResults();
void blinkLED(int times, int delayTime);
int calculateStdDev(int values[], int numValues, int average);
void suggestFixes(int issueCode);

void setup() {
  Serial.begin(115200);
  delay(2000); // Give time for serial monitor to connect
  
  pinMode(LED_PIN, OUTPUT);
  
  // If using power pin to control sensor
  if (POWER_PIN != -1) {
    pinMode(POWER_PIN, OUTPUT);
    digitalWrite(POWER_PIN, LOW); // Start with sensor off
  }
  
  Serial.println("\n=== Soil Moisture Sensor Anomaly Detection ===\n");
  Serial.println("This tool will help identify issues with your soil moisture sensor.");
  Serial.println("Follow these instructions for best results:");
  Serial.println("1. Start with the sensor in air for the first few batches");
  Serial.println("2. Place in dry soil when instructed");
  Serial.println("3. Place in wet soil when instructed");
  Serial.println();
  
  Serial.println("Hardware Information:");
  Serial.print("  - ESP8266 Chip ID: 0x");
  Serial.println(ESP.getChipId(), HEX);
  Serial.print("  - VCC Voltage: ");
  Serial.print(ESP.getVcc() / 1000.0);
  Serial.println("V");
  Serial.print("  - Free Heap: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" bytes");
  Serial.println();
}

void loop() {
  // Test with sensor in air
  Serial.println("=== TEST 1: SENSOR IN AIR ===");
  Serial.println("Please ensure the sensor is completely dry and in air.");
  Serial.println("Press any key to start the test...");
  while (!Serial.available()) { delay(100); }
  Serial.read(); // Clear the buffer
  
  collectSamples();
  analyzeSamples();
  printAnalysisResults();
  
  delay(5000);
  
  // Test with sensor in dry soil
  Serial.println("\n=== TEST 2: SENSOR IN DRY SOIL ===");
  Serial.println("Please place the sensor in DRY soil.");
  Serial.println("Press any key to start the test...");
  while (!Serial.available()) { delay(100); }
  Serial.read(); // Clear the buffer
  
  collectSamples();
  analyzeSamples();
  printAnalysisResults();
  
  delay(5000);
  
  // Test with sensor in wet soil
  Serial.println("\n=== TEST 3: SENSOR IN WET SOIL ===");
  Serial.println("Please place the sensor in WET soil (or water).");
  Serial.println("Press any key to start the test...");
  while (!Serial.available()) { delay(100); }
  Serial.read(); // Clear the buffer
  
  collectSamples();
  analyzeSamples();
  printAnalysisResults();
  
  // Rapid reading test to check for corrosion/degradation
  Serial.println("\n=== TEST 4: RAPID READING TEST ===");
  Serial.println("Leave sensor in wet soil. This test checks for reading degradation.");
  Serial.println("Press any key to start the test...");
  while (!Serial.available()) { delay(100); }
  Serial.read(); // Clear the buffer
  
  rapidReadingTest();
  
  Serial.println("\nAll tests completed. Press any key to restart tests...");
  while (!Serial.available()) { delay(100); }
  Serial.read(); // Clear the buffer
}

void collectSamples() {
  Serial.println("Collecting samples...");
  
  for (int batch = 0; batch < NUM_BATCHES; batch++) {
    Serial.print("Batch ");
    Serial.print(batch + 1);
    Serial.print("/");
    Serial.print(NUM_BATCHES);
    Serial.print(": ");
    
    // Power on sensor if using power control
    if (POWER_PIN != -1) {
      digitalWrite(POWER_PIN, HIGH);
      delay(100); // Stabilization time
    }
    
    // Collect samples
    long sum = 0;
    int minVal = MAX_READING;
    int maxVal = MIN_READING;
    
    for (int i = 0; i < NUM_SAMPLES; i++) {
      samples[i] = analogRead(ANALOG_PIN);
      sum += samples[i];
      
      if (samples[i] < minVal) minVal = samples[i];
      if (samples[i] > maxVal) maxVal = samples[i];
      
      Serial.print(".");
      delay(SAMPLE_INTERVAL);
    }
    
    // Power off sensor if using power control
    if (POWER_PIN != -1) {
      digitalWrite(POWER_PIN, LOW);
    }
    
    // Calculate batch statistics
    int average = sum / NUM_SAMPLES;
    batchAverages[batch] = average;
    batchMinValues[batch] = minVal;
    batchMaxValues[batch] = maxVal;
    batchStdDevValues[batch] = calculateStdDev(samples, NUM_SAMPLES, average);
    
    Serial.println(" Done");
    delay(BATCH_DELAY);
  }
}

int calculateStdDev(int values[], int numValues, int average) {
  long sum = 0;
  for (int i = 0; i < numValues; i++) {
    long diff = values[i] - average;
    sum += diff * diff;
  }
  return sqrt(sum / numValues);
}

void analyzeSamples() {
  Serial.println("\nAnalyzing samples...");
  
  // Placeholder for detecting anomalies
  delay(1000); // Simulate processing time
}

void printAnalysisResults() {
  Serial.println("\n=== ANALYSIS RESULTS ===");
  
  // Calculate overall statistics
  int overallMin = MAX_READING;
  int overallMax = MIN_READING;
  long overallSum = 0;
  
  for (int i = 0; i < NUM_BATCHES; i++) {
    if (batchMinValues[i] < overallMin) overallMin = batchMinValues[i];
    if (batchMaxValues[i] > overallMax) overallMax = batchMaxValues[i];
    overallSum += batchAverages[i];
  }
  
  int overallAvg = overallSum / NUM_BATCHES;
  
  // Print overall statistics
  Serial.println("Overall Statistics:");
  Serial.print("  - Average Reading: ");
  Serial.println(overallAvg);
  Serial.print("  - Min Reading: ");
  Serial.println(overallMin);
  Serial.print("  - Max Reading: ");
  Serial.println(overallMax);
  Serial.print("  - Range: ");
  Serial.println(overallMax - overallMin);
  
  // Print batch statistics
  Serial.println("\nBatch Statistics:");
  for (int i = 0; i < NUM_BATCHES; i++) {
    Serial.print("  Batch ");
    Serial.print(i + 1);
    Serial.print(": Avg=");
    Serial.print(batchAverages[i]);
    Serial.print(", Min=");
    Serial.print(batchMinValues[i]);
    Serial.print(", Max=");
    Serial.print(batchMaxValues[i]);
    Serial.print(", StdDev=");
    Serial.println(batchStdDevValues[i]);
  }
  
  // Check for issues
  Serial.println("\nIssue Detection:");
  
  // Check for noise
  bool noiseDetected = false;
  for (int i = 0; i < NUM_BATCHES; i++) {
    if (batchMaxValues[i] - batchMinValues[i] > NOISE_THRESHOLD) {
      noiseDetected = true;
      break;
    }
  }
  
  if (noiseDetected) {
    Serial.println("  [WARNING] High noise levels detected in readings");
    suggestFixes(1);
  } else {
    Serial.println("  [OK] Noise levels are acceptable");
  }
  
  // Check for drift
  int maxDrift = 0;
  for (int i = 1; i < NUM_BATCHES; i++) {
    int drift = abs(batchAverages[i] - batchAverages[i-1]);
    if (drift > maxDrift) maxDrift = drift;
  }
  
  if (maxDrift > DRIFT_THRESHOLD) {
    Serial.println("  [WARNING] Significant drift detected between batches");
    suggestFixes(2);
  } else {
    Serial.println("  [OK] Readings are stable between batches");
  }
  
  // Check for expected range
  bool rangeIssue = false;
  
  // This logic will vary based on which test we're in (air, dry, wet)
  // For this example, we're just checking if values are within the ADC range
  if (overallMin < MIN_READING || overallMax > MAX_READING) {
    rangeIssue = true;
  }
  
  if (rangeIssue) {
    Serial.println("  [WARNING] Readings outside expected range");
    suggestFixes(3);
  } else {
    Serial.println("  [OK] Readings within expected range");
  }
  
  // Overall assessment
  Serial.println("\nOverall Assessment:");
  if (noiseDetected || maxDrift > DRIFT_THRESHOLD || rangeIssue) {
    Serial.println("  [ISSUE DETECTED] Sensor may need calibration or replacement");
  } else {
    Serial.println("  [SENSOR OK] Soil moisture sensor is functioning properly");
  }
}

void rapidReadingTest() {
  const int numReadings = 500;
  int readings[numReadings];
  
  Serial.println("Taking 500 consecutive readings to check for degradation...");
  
  // Power on sensor if using power control
  if (POWER_PIN != -1) {
    digitalWrite(POWER_PIN, HIGH);
    delay(100); // Stabilization time
  }
  
  // Take rapid readings
  for (int i = 0; i < numReadings; i++) {
    readings[i] = analogRead(ANALOG_PIN);
    
    if (i % 50 == 0) {
      Serial.print(".");
    }
    
    delay(10); // Small delay between readings
  }
  
  // Power off sensor if using power control
  if (POWER_PIN != -1) {
    digitalWrite(POWER_PIN, LOW);
  }
  
  Serial.println(" Done");
  
  // Analyze for degradation
  int firstAvg = 0;
  int lastAvg = 0;
  
  // Average first 50 readings
  for (int i = 0; i < 50; i++) {
    firstAvg += readings[i];
  }
  firstAvg /= 50;
  
  // Average last 50 readings
  for (int i = numReadings - 50; i < numReadings; i++) {
    lastAvg += readings[i];
  }
  lastAvg /= 50;
  
  Serial.println("\nDegradation Test Results:");
  Serial.print("  - First 50 readings average: ");
  Serial.println(firstAvg);
  Serial.print("  - Last 50 readings average: ");
  Serial.println(lastAvg);
  Serial.print("  - Difference: ");
  Serial.println(abs(lastAvg - firstAvg));
  
  if (abs(lastAvg - firstAvg) > 20) {
    Serial.println("  [WARNING] Significant reading degradation detected");
    Serial.println("  This may indicate sensor corrosion or electrolysis issues");
    suggestFixes(4);
  } else {
    Serial.println("  [OK] No significant degradation detected");
  }
}

void suggestFixes(int issueCode) {
  Serial.println("\nRecommended Solutions:");
  
  switch (issueCode) {
    case 1: // Noise issues
      Serial.println("  1. Check for loose connections or damaged wires");
      Serial.println("  2. Add a capacitor (100nF) between sensor power and ground to reduce noise");
      Serial.println("  3. Use the power pin method to power the sensor only during readings");
      Serial.println("  4. Move the sensor away from other electronics or power lines");
      Serial.println("  5. Try a different power supply or lower ADC reference voltage");
      break;
      
    case 2: // Drift issues
      Serial.println("  1. Check if the soil is settling around the sensor");
      Serial.println("  2. Ensure the sensor isn't moving during readings");
      Serial.println("  3. Allow longer time for readings to stabilize");
      Serial.println("  4. Check for temperature fluctuations affecting readings");
      Serial.println("  5. Implement temperature compensation if using in variable conditions");
      break;
      
    case 3: // Range issues
      Serial.println("  1. Verify the sensor is connected to the correct pin");
      Serial.println("  2. Check power supply voltage (should be stable 3.3V)");
      Serial.println("  3. Inspect sensor for physical damage or contamination");
      Serial.println("  4. Calibrate the sensor with known wet and dry values");
      Serial.println("  5. Replace the sensor if issues persist");
      break;
      
    case 4: // Degradation issues
      Serial.println("  1. Use the power pin method to power the sensor only during readings");
      Serial.println("  2. Apply a clear coating to the non-sensing parts of the sensor");
      Serial.println("  3. Use AC measurements instead of DC to prevent electrolysis");
      Serial.println("  4. Try a capacitive soil moisture sensor instead of resistive");
      Serial.println("  5. Replace the sensor if significant corrosion is visible");
      break;
      
    default:
      Serial.println("  - Unknown issue. Please check hardware connections");
      break;
  }
}

void blinkLED(int times, int delayTime) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayTime);
    digitalWrite(LED_PIN, LOW);
    delay(delayTime);
  }
}

/*
 * Common Soil Moisture Sensor Issues:
 * 
 * 1. Corrosion
 *    - Caused by electrolysis when constantly powered
 *    - Solution: Power sensor only during readings
 * 
 * 2. False Readings
 *    - Caused by poor soil contact or air pockets
 *    - Solution: Ensure proper placement and packing of soil
 * 
 * 3. Drift Over Time
 *    - Caused by mineralization, corrosion, or soil settling
 *    - Solution: Regular calibration or sensor replacement
 * 
 * 4. Temperature Sensitivity
 *    - Soil conductivity changes with temperature
 *    - Solution: Implement temperature compensation
 * 
 * 5. Power Supply Issues
 *    - Fluctuating power leads to inconsistent readings
 *    - Solution: Use stable voltage regulator and filter capacitors
 */ 