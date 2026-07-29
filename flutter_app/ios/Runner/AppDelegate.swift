import CoreMotion
import CryptoKit
import Flutter
import Security
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private static let stepChannelName = "app.habitdiet/steps"
  private static let glassMotionChannelName = "app.habitdiet/glass-motion"
  private static let legacyMigrationChannelName = "app.habitdiet/legacy-migration"
  private static let legacyKeyPrefix = "@habitdiet_"
  private static let legacyManifestName = "manifest.json"
  private static let maxLegacyManifestBytes = 8 * 1024 * 1024
  private static let maxLegacyValueBytes = 32 * 1024 * 1024

  private let pedometer = CMPedometer()
  private let glassMotionStreamHandler = GlassMotionStreamHandler()
  private var stepChannel: FlutterMethodChannel?
  private var glassMotionChannel: FlutterEventChannel?
  private var legacyMigrationChannel: FlutterMethodChannel?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)

    let channel = FlutterMethodChannel(
      name: Self.stepChannelName,
      binaryMessenger: engineBridge.applicationRegistrar.messenger()
    )
    stepChannel = channel
    channel.setMethodCallHandler { [weak self] call, result in
      guard let self else {
        result(
          FlutterError(
            code: "STEPS_UNAVAILABLE",
            message: "Layanan langkah tidak tersedia.",
            details: nil
          )
        )
        return
      }
      self.handleStepMethod(call, result: result)
    }

    let glassMotionChannel = FlutterEventChannel(
      name: Self.glassMotionChannelName,
      binaryMessenger: engineBridge.applicationRegistrar.messenger()
    )
    self.glassMotionChannel = glassMotionChannel
    glassMotionChannel.setStreamHandler(glassMotionStreamHandler)

    let migrationChannel = FlutterMethodChannel(
      name: Self.legacyMigrationChannelName,
      binaryMessenger: engineBridge.applicationRegistrar.messenger()
    )
    legacyMigrationChannel = migrationChannel
    migrationChannel.setMethodCallHandler { call, result in
      guard call.method == "readLegacyStorage" else {
        result(FlutterMethodNotImplemented)
        return
      }

      DispatchQueue.global(qos: .utility).async {
        let payload = Self.readLegacyStorage()
        DispatchQueue.main.async {
          result(payload)
        }
      }
    }
  }

  /// Reads the previous Expo app's storage in place. No source file or
  /// Keychain item is changed or removed.
  private static func readLegacyStorage() -> [String: Any] {
    var payload: [String: Any] = [
      "values": readLegacyAsyncStorage(),
    ]
    if let key = readExpoSecureStoreKey(), !key.isEmpty {
      payload["geminiApiKey"] = key
    }
    return payload
  }

  private static func readLegacyAsyncStorage() -> [String: String] {
    let fileManager = FileManager.default
    var oldDirectories: [URL] = []

    if let documents = fileManager.urls(
      for: .documentDirectory,
      in: .userDomainMask
    ).first {
      // Old React Native, Expo, and AsyncStorage directory names.
      oldDirectories.append(
        documents.appendingPathComponent("RNCAsyncLocalStorage_V1", isDirectory: true)
      )
      oldDirectories.append(
        documents.appendingPathComponent("RCTAsyncLocalStorage", isDirectory: true)
      )
      oldDirectories.append(
        documents.appendingPathComponent("RCTAsyncLocalStorage_V1", isDirectory: true)
      )
    }

    if
      let applicationSupport = fileManager.urls(
        for: .applicationSupportDirectory,
        in: .userDomainMask
      ).first,
      let bundleIdentifier = Bundle.main.bundleIdentifier
    {
      let currentDirectory = applicationSupport
        .appendingPathComponent(bundleIdentifier, isDirectory: true)
        .appendingPathComponent("RCTAsyncLocalStorage_V1", isDirectory: true)
      if let values = readLegacyManifest(at: currentDirectory) {
        return values
      }
    }

    // Only fall back to Documents when the authoritative current manifest is
    // absent or unreadable. Choosing the newest old manifest avoids reviving
    // keys that were later deleted from the current store.
    oldDirectories.sort {
      legacyManifestModificationDate(at: $0) > legacyManifestModificationDate(at: $1)
    }
    for directory in oldDirectories {
      if let values = readLegacyManifest(at: directory) {
        return values
      }
    }
    return [:]
  }

  private static func legacyManifestModificationDate(at directory: URL) -> Date {
    let manifestURL = directory.appendingPathComponent(legacyManifestName)
    let attributes = try? FileManager.default.attributesOfItem(atPath: manifestURL.path)
    return attributes?[.modificationDate] as? Date ?? .distantPast
  }

  private static func readLegacyManifest(at directory: URL) -> [String: String]? {
    let fileManager = FileManager.default
    let manifestURL = directory.appendingPathComponent(legacyManifestName)

    guard
      let attributes = try? fileManager.attributesOfItem(atPath: manifestURL.path),
      let byteCount = attributes[.size] as? NSNumber,
      byteCount.intValue <= maxLegacyManifestBytes,
      let data = try? Data(contentsOf: manifestURL, options: .mappedIfSafe),
      let object = try? JSONSerialization.jsonObject(with: data),
      let manifest = object as? [String: Any]
    else {
      return nil
    }

    var values: [String: String] = [:]
    for (key, storedValue) in manifest where key.hasPrefix(legacyKeyPrefix) {
      if let inlineValue = storedValue as? String {
        values[key] = inlineValue
        continue
      }
      guard storedValue is NSNull else { continue }

      let valueURL = directory.appendingPathComponent(md5Hex(key))
      guard
        let valueAttributes = try? fileManager.attributesOfItem(atPath: valueURL.path),
        let valueByteCount = valueAttributes[.size] as? NSNumber,
        valueByteCount.intValue <= maxLegacyValueBytes,
        let valueData = try? Data(contentsOf: valueURL, options: .mappedIfSafe),
        let value = String(data: valueData, encoding: .utf8)
      else {
        continue
      }
      values[key] = value
    }
    return values
  }

  private static func md5Hex(_ value: String) -> String {
    Insecure.MD5.hash(data: Data(value.utf8))
      .map { String(format: "%02x", Int($0)) }
      .joined()
  }

  private static func readExpoSecureStoreKey() -> String? {
    let alias = Data("habitdiet_gemini_api_key".utf8)

    // expo-secure-store first used "app", then introduced the unauthenticated
    // suffix. Both are read to support upgrades from either version.
    for service in ["app:no-auth", "app"] {
      let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: service,
        kSecAttrGeneric as String: alias,
        kSecAttrAccount as String: alias,
        kSecMatchLimit as String: kSecMatchLimitOne,
        kSecReturnData as String: true,
      ]

      var item: CFTypeRef?
      guard
        SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
        let data = item as? Data,
        let value = String(data: data, encoding: .utf8)?
          .trimmingCharacters(in: .whitespacesAndNewlines),
        !value.isEmpty
      else {
        continue
      }
      return value
    }
    return nil
  }

  private func handleStepMethod(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "isStepCountingAvailable":
      result(CMPedometer.isStepCountingAvailable())
    case "getAuthorizationStatus":
      result(stepAuthorizationStatus())
    case "getTodaySteps":
      queryTodaySteps(result: result)
    case "startStepUpdates":
      startStepUpdates(result: result)
    case "stopStepUpdates":
      pedometer.stopUpdates()
      result(nil)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private func queryTodaySteps(result: @escaping FlutterResult) {
    guard CMPedometer.isStepCountingAvailable() else {
      result(unavailableError())
      return
    }

    let start = Calendar.current.startOfDay(for: Date())
    pedometer.queryPedometerData(from: start, to: Date()) { [weak self] data, error in
      DispatchQueue.main.async {
        guard let self else {
          result(
            FlutterError(
              code: "STEPS_UNAVAILABLE",
              message: "Layanan langkah tidak tersedia.",
              details: nil
            )
          )
          return
        }

        if let error {
          result(self.flutterError(for: error))
          return
        }
        guard let data else {
          result(
            FlutterError(
              code: "STEPS_UNAVAILABLE",
              message: "Data langkah hari ini belum tersedia.",
              details: nil
            )
          )
          return
        }
        result(self.stepPayload(from: data))
      }
    }
  }

  private func startStepUpdates(result: @escaping FlutterResult) {
    guard CMPedometer.isStepCountingAvailable() else {
      result([
        "started": false,
        "authorizationStatus": "unsupported",
      ])
      return
    }

    pedometer.stopUpdates()
    let start = Calendar.current.startOfDay(for: Date())
    pedometer.startUpdates(from: start) { [weak self] data, error in
      guard let self else { return }
      DispatchQueue.main.async {
        if let error {
          let flutterError = self.flutterError(for: error)
          self.stepChannel?.invokeMethod(
            "stepTrackingError",
            arguments: [
              "code": flutterError.code,
              "message": flutterError.message ?? "Pembaruan langkah berhenti.",
            ]
          )
          return
        }
        guard let data else { return }
        self.stepChannel?.invokeMethod(
          "stepsUpdated",
          arguments: self.stepPayload(from: data)
        )
      }
    }

    result([
      "started": true,
      "authorizationStatus": stepAuthorizationStatus(),
    ])
  }

  private func stepPayload(from data: CMPedometerData) -> [String: Any] {
    [
      "steps": data.numberOfSteps.intValue,
      "startTime": Int(data.startDate.timeIntervalSince1970 * 1000),
      "endTime": Int(data.endDate.timeIntervalSince1970 * 1000),
      "authorizationStatus": stepAuthorizationStatus(),
    ]
  }

  private func stepAuthorizationStatus() -> String {
    guard CMPedometer.isStepCountingAvailable() else {
      return "unsupported"
    }

    switch CMPedometer.authorizationStatus() {
    case .notDetermined:
      return "notDetermined"
    case .restricted:
      return "restricted"
    case .denied:
      return "denied"
    case .authorized:
      return "authorized"
    @unknown default:
      return "unknown"
    }
  }

  private func flutterError(for error: Error) -> FlutterError {
    let status = CMPedometer.authorizationStatus()
    if status == .denied {
      return FlutterError(
        code: "STEPS_DENIED",
        message: "Akses Gerak & Kebugaran ditolak.",
        details: nil
      )
    }
    if status == .restricted {
      return FlutterError(
        code: "STEPS_RESTRICTED",
        message: "Akses Gerak & Kebugaran dibatasi.",
        details: nil
      )
    }

    let nativeError = error as NSError
    return FlutterError(
      code: "STEPS_ERROR",
      message: nativeError.localizedDescription,
      details: [
        "domain": nativeError.domain,
        "nativeCode": nativeError.code,
      ]
    )
  }

  private func unavailableError() -> FlutterError {
    FlutterError(
      code: "STEPS_UNAVAILABLE",
      message: "Penghitung langkah tidak tersedia di perangkat ini.",
      details: nil
    )
  }
}

/// Lazily streams a small, normalized device tilt vector for reflective glass.
///
/// Core Motion only runs while Flutter has at least one listener and the app is
/// active. Unsupported devices (including the simulator) receive a neutral
/// vector, so the visual effect remains usable without a sensor.
private final class GlassMotionStreamHandler: NSObject, FlutterStreamHandler {
  private static let updateInterval = 1.0 / 60.0
  private static let normalizationAngle = 0.24
  private static let smoothingFactor = 0.24
  private static let deadZone = 0.008

  private let motionManager = CMMotionManager()
  private let motionQueue: OperationQueue = {
    let queue = OperationQueue()
    queue.name = "app.habitdiet.glass-motion"
    queue.maxConcurrentOperationCount = 1
    queue.qualityOfService = .userInteractive
    return queue
  }()

  private var eventSink: FlutterEventSink?
  private var isSubscribed = false
  private var updateGeneration = 0

  override init() {
    super.init()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(applicationDidBecomeActive),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(applicationDidEnterBackground),
      name: UIApplication.didEnterBackgroundNotification,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
    stopMotionUpdates()
  }

  func onListen(
    withArguments arguments: Any?,
    eventSink events: @escaping FlutterEventSink
  ) -> FlutterError? {
    assert(Thread.isMainThread)

    stopMotionUpdates()
    eventSink = events
    isSubscribed = true
    sendNeutralSample()
    startMotionUpdatesIfPossible()
    return nil
  }

  func onCancel(withArguments arguments: Any?) -> FlutterError? {
    assert(Thread.isMainThread)

    isSubscribed = false
    eventSink = nil
    stopMotionUpdates()
    return nil
  }

  @objc private func applicationDidBecomeActive() {
    guard isSubscribed else { return }
    sendNeutralSample()
    startMotionUpdatesIfPossible()
  }

  @objc private func applicationDidEnterBackground() {
    stopMotionUpdates()
  }

  private func startMotionUpdatesIfPossible() {
    guard
      isSubscribed,
      UIApplication.shared.applicationState == .active,
      motionManager.isDeviceMotionAvailable,
      !motionManager.isDeviceMotionActive
    else {
      return
    }

    updateGeneration += 1
    let generation = updateGeneration
    motionManager.deviceMotionUpdateInterval = Self.updateInterval

    // Filter state is local to this serial Core Motion callback. This avoids
    // sharing mutable sensor state between the motion and main queues.
    var referenceAttitude: CMAttitude?
    var smoothedX = 0.0
    var smoothedY = 0.0
    motionManager.startDeviceMotionUpdates(
      using: .xArbitraryZVertical,
      to: motionQueue
    ) { [weak self] motion, error in
      guard let self, error == nil, let attitude = motion?.attitude else { return }

      if referenceAttitude == nil {
        referenceAttitude = attitude.copy() as? CMAttitude
        return
      }
      guard let referenceAttitude else { return }

      // Work from the posture in which this screen became active instead of
      // absolute gravity. Absolute gravity pins the reflection to one edge
      // while an iPhone is held upright.
      guard let relative = attitude.copy() as? CMAttitude else { return }
      relative.multiply(byInverseOf: referenceAttitude)

      // In portrait, pitch moves the light horizontally and roll moves it
      // vertically. The signs make the highlight follow the raised edge.
      let rawX = self.normalized(relative.pitch)
      let rawY = self.normalized(-relative.roll)
      smoothedX += (rawX - smoothedX) * Self.smoothingFactor
      smoothedY += (rawY - smoothedY) * Self.smoothingFactor

      // Remove tiny sensor noise so a resting phone has a stable reflection.
      let x = abs(smoothedX) < Self.deadZone ? 0.0 : smoothedX
      let y = abs(smoothedY) < Self.deadZone ? 0.0 : smoothedY

      DispatchQueue.main.async { [weak self] in
        guard
          let self,
          self.isSubscribed,
          generation == self.updateGeneration,
          let eventSink = self.eventSink
        else {
          return
        }
        eventSink([
          "x": self.clamped(x),
          "y": self.clamped(y),
        ])
      }
    }
  }

  private func stopMotionUpdates() {
    updateGeneration += 1
    motionManager.stopDeviceMotionUpdates()
    motionQueue.cancelAllOperations()
  }

  private func sendNeutralSample() {
    eventSink?([
      "x": 0.0,
      "y": 0.0,
    ])
  }

  private func normalized(_ angle: Double) -> Double {
    let linear = clamped(angle / Self.normalizationAngle)
    // A subtle ease-out makes small tilts visible without requiring the user
    // to rotate the phone far. The dead zone still removes resting noise.
    let magnitude = abs(linear)
    let eased = pow(magnitude, 0.82)
    return linear < 0 ? -eased : eased
  }

  private func clamped(_ value: Double) -> Double {
    min(1.0, max(-1.0, value))
  }
}
