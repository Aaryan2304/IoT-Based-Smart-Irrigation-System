/*
 * Soil Moisture Sensor Calibration Sketch
 * 
 * This sketch helps calibrate soil moisture sensors by reading raw analog values.
 * Use these readings to set dryValue and wetValue in the main firmware.
 * 
 * Instructions:
 * 1. Upload this sketch to your NodeMCU
 * 2. Open Serial Monitor (115200 baud)
 * 3. Note the reading with sensor in dry air (dryValue)
 * 4. Note the reading with sensor in water (wetValue)
 */

// Soil moisture sensor is connected to A0
#define SOIL_MOISTURE_PIN A0

// Variables to store min/max values observed
int minValue = 1023;
int maxValue = 0;
int lastValue = 0;

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  
  // Wait for serial port to connect
  while (!Serial) {
    ; // wait for serial port to connect
  }
  
  Serial.println("======================================");
  Serial.println("  Soil Moisture Sensor Calibration");
  Serial.println("======================================");
  Serial.println("Follow these steps:");
  Serial.println("1. Start with sensor in air (dry condition)");
  Serial.println("2. Note the 'Raw Value' reading - this is your dryValue");
  Serial.println("3. Place sensor in water (wet condition)");
  Serial.println("4. Note the 'Raw Value' reading - this is your wetValue");
  Serial.println("5. Update these values in the main firmware");
  Serial.println("======================================\n");
  
  delay(2000);
}

void loop() {
  // Read the analog value from the sensor
  int rawValue = analogRead(SOIL_MOISTURE_PIN);
  
  // Update min/max if needed
  if (rawValue < minValue) minValue = rawValue;
  if (rawValue > maxValue) maxValue = rawValue;
  
  // Only print when value changes significantly to reduce output spam
  if (abs(rawValue - lastValue) > 5) {
    lastValue = rawValue;
    
    // Print raw value
    Serial.print("Raw Value: ");
    Serial.print(rawValue);
    
    // Calculate and print an estimated percentage using current min/max
    int percentage = map(rawValue, maxValue, minValue, 0, 100);
    percentage = constrain(percentage, 0, 100);
    
    Serial.print("\tEstimated moisture: ");
    Serial.print(percentage);
    Serial.println("%");
    
    // Print observed range
    Serial.print("Observed range - Min: ");
    Serial.print(minValue);
    Serial.print(" Max: ");
    Serial.println(maxValue);
    
    Serial.println("-------------------------------------");
  }
  
  delay(500);
} 