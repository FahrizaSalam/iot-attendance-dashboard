"use client";

import { useEffect, useState, useRef } from "react";
import mqtt from "mqtt";
import {
  Wifi,
  WifiOff,
  UserCheck,
  Clock,
  Activity,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

const MQTT_SERVER = "wss://broker.hivemq.com:8884/mqtt";
const DEVICE_ID = "absensi-01";
const TOPIC_SCAN = "kampus/absensi/absensi-01/scan";
const TOPIC_RESPONSE = "kampus/absensi/absensi-01/response";
const TOPIC_STATUS = "kampus/absensi/absensi-01/status";

const DATABASE_LOKAL: Record<string, string> = {
  "01020304": "Muhammad Aziz",
  "11223344": "Imam Salafudin",
  "55667788": "Fawwaz akbar",
  "AABBCCDD": "Khoirul rosyid"
};

interface ScanData {
  device_id: string;
  uid: string;
  uptime_ms: number;
  rssi: number;
  timestamp: number;
}

interface LogEntry {
  id: string;
  uid: string;
  status: "ok" | "error";
  name: string;
  timestamp: number;
}

export default function Dashboard() {
  const [deviceStatus, setDeviceStatus] = useState<
    "online" | "offline" | "unknown"
  >("unknown");
  const [brokerStatus, setBrokerStatus] = useState<
    "connected" | "disconnected"
  >("disconnected");
  const [latestLog, setLatestLog] = useState<LogEntry | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const clientRef = useRef<mqtt.MqttClient | null>(null);

  useEffect(() => {
    // Connect to MQTT Broker via WebSockets
    const client = mqtt.connect(MQTT_SERVER, {
      clientId: `web-dash-${Math.random().toString(16).substring(2, 8)}`,
    });

    clientRef.current = client;

    client.on("connect", () => {
      setBrokerStatus("connected");
      client.subscribe([TOPIC_SCAN, TOPIC_STATUS]);
    });

    client.on("message", (topic, message) => {
      const payload = message.toString();

      if (topic === TOPIC_STATUS) {
        setDeviceStatus(payload as "online" | "offline");
      } else if (topic === TOPIC_SCAN) {
        try {
          const data = JSON.parse(payload) as ScanData;
          data.timestamp = Date.now();
          
          const resolvedName = DATABASE_LOKAL[data.uid];
          const status = resolvedName ? "ok" : "error";
          const nameToUse = resolvedName || "Kartu Tidak Dikenal";

          const newLog: LogEntry = {
            id: Math.random().toString(36).substring(2, 9),
            uid: data.uid,
            status: status,
            name: nameToUse,
            timestamp: data.timestamp,
          };
          
          setLatestLog(newLog);
          setLogs((prev) => [newLog, ...prev].slice(0, 20));
          
          // Hapus latest log display setelah 4 detik
          setTimeout(() => {
            setLatestLog(null);
          }, 4000);
        } catch (e) {
          console.error("Invalid scan data");
        }
      }
    });

    client.on("offline", () => setBrokerStatus("disconnected"));
    client.on("error", () => setBrokerStatus("disconnected"));

    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Sistem Absensi IoT
              </h1>
              <p className="text-sm text-gray-500">Panel Pemantauan ESP32</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${brokerStatus === "connected" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${brokerStatus === "connected" ? "bg-green-600" : "bg-red-600"}`}
              />
              <span className="text-sm font-medium">
                Broker:{" "}
                {brokerStatus === "connected" ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${deviceStatus === "online" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-100 border-gray-300 text-gray-600"}`}
            >
              {deviceStatus === "online" ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                Device: {deviceStatus === "unknown" ? "Offline" : deviceStatus}
              </span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Scan Card */}
            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center">
              {!latestLog ? (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 transition-transform duration-500 hover:scale-105">
                    <UserCheck className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-700">
                      Sistem Absensi Otomatis Aktif
                    </h2>
                    <p className="text-gray-500 mt-1 text-sm">
                      Silakan tap kartu RFID pada perangkat absensi. Data akan tercatat otomatis.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-300">
                  <div className="text-center">
                    {latestLog.status === "ok" ? (
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4 shadow-sm">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 text-red-600 mb-4 shadow-sm">
                        <XCircle className="w-10 h-10" />
                      </div>
                    )}
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {latestLog.status === "ok" ? "Absensi Berhasil!" : "Absensi Gagal"}
                    </h2>
                    <div className="text-lg font-medium text-gray-800 mb-3">
                      {latestLog.name}
                    </div>
                    <div className="mt-2 font-mono text-sm text-gray-600 bg-gray-100 py-1.5 px-3 rounded-md border border-gray-200 inline-block">
                      UID: {latestLog.uid}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* History Sidebar */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-[400px] lg:h-auto flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                Riwayat Terakhir
              </h3>
              <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">
                {logs.length} Data
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Clock className="w-6 h-6 opacity-50" />
                  <p className="text-xs">Belum ada riwayat scan</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-md border border-gray-100 bg-gray-50 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {log.status === "ok" ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        )}
                        <span className="font-medium text-sm text-gray-800">
                          {log.name}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-gray-500">
                        UID: {log.uid}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
