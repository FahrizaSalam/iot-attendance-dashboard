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
  AlertCircle
} from "lucide-react";

const MQTT_SERVER = process.env.NEXT_PUBLIC_MQTT_SERVER || "wss://broker.hivemq.com:8884/mqtt";
const MQTT_BASE_TOPIC = process.env.NEXT_PUBLIC_MQTT_BASE_TOPIC || "kampus/absensi/absensi-01";

const TOPIC_SCAN = `${MQTT_BASE_TOPIC}/scan`;
const TOPIC_RESPONSE = `${MQTT_BASE_TOPIC}/response`;
const TOPIC_STATUS = `${MQTT_BASE_TOPIC}/status`;

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
  const [deviceStatus, setDeviceStatus] = useState<"online" | "offline" | "unknown">("unknown");
  const [brokerStatus, setBrokerStatus] = useState<"connected" | "disconnected">("disconnected");
  const [currentScan, setCurrentScan] = useState<ScanData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [studentName, setStudentName] = useState("");
  
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
          setCurrentScan(data);
          setStudentName("");
        } catch (e) {
          console.error("Invalid scan data", e);
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

  const handleResponse = (status: "ok" | "error") => {
    if (!currentScan || !clientRef.current) return;
    
    const nameToUse = status === "ok" ? (studentName || "Tanpa Nama") : "Tidak Dikenal";
    
    const responsePayload = JSON.stringify({
      status: status,
      nama: nameToUse
    });
    
    clientRef.current.publish(TOPIC_RESPONSE, responsePayload);
    
    // Add to logs
    setLogs(prev => [{
      id: Math.random().toString(36).substring(2, 9),
      uid: currentScan.uid,
      status: status,
      name: nameToUse,
      timestamp: Date.now()
    }, ...prev].slice(0, 20)); // keep last 20
    
    setCurrentScan(null);
    setStudentName("");
  };

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
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${brokerStatus === 'connected' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <div className={`w-2 h-2 rounded-full ${brokerStatus === 'connected' ? 'bg-green-600' : 'bg-red-600'}`} />
              <span className="text-sm font-medium">Broker: {brokerStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${deviceStatus === 'online' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
              {deviceStatus === 'online' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-medium">Device: {deviceStatus === 'unknown' ? 'Offline' : deviceStatus}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Action Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Scan Card */}
            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center">
              
              {!currentScan ? (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                    <UserCheck className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-700">Menunggu Kartu...</h2>
                    <p className="text-gray-500 mt-1 text-sm">Silakan tap kartu RFID pada perangkat absensi.</p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 text-blue-600 mb-3">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Kartu Baru Terdeteksi</h2>
                    <div className="mt-2 font-mono text-sm text-blue-700 bg-blue-50 py-1.5 px-3 rounded-md border border-blue-200 inline-block">
                      UID: {currentScan.uid}
                    </div>
                  </div>

                  <div className="space-y-4 bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Mahasiswa</label>
                      <input 
                        type="text" 
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        autoFocus
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button 
                        onClick={() => handleResponse("ok")}
                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-medium transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Terima (Approve)
                      </button>
                      <button 
                        onClick={() => handleResponse("error")}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-medium transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Tolak (Reject)
                      </button>
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
                  <div key={log.id} className="p-3 rounded-md border border-gray-100 bg-gray-50 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {log.status === 'ok' ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        )}
                        <span className="font-medium text-sm text-gray-800">{log.name}</span>
                      </div>
                      <div className="font-mono text-xs text-gray-500">UID: {log.uid}</div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
