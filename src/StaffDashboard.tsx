import React, { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";

export const StaffDashboard: React.FC = () => {
  const [queues, setQueues] = useState<any[]>([]);
  const [pinInput, setPinInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Simple PIN Code Security (PIN: 1234)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === "1234") {
      setIsAuthenticated(true);
    } else {
      alert("Invalid Staff PIN Code!");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const queueRef = ref(db, "queues");

    // Listen to Firebase Realtime Database updates
    const unsubscribe = onValue(queueRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const queueList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

        // Play Notification Sound kapag may panibagong ticket na pumasok
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.play().catch(() => {});

        setQueues(queueList.reverse()); // Pinakabagong ticket ang nasa itaas
      } else {
        setQueues([]);
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Function para i-update ang status sa Firebase
  const updateStatus = (id: string, newStatus: string) => {
    update(ref(db, `queues/${id}`), {
      status: newStatus,
    });
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0f172a", color: "#fff" }}>
        <form onSubmit={handleLogin} style={{ background: "#1e293b", padding: "30px", borderRadius: "12px", textAlign: "center", width: "320px" }}>
          <h2>Staff Portal Access</h2>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>Enter 4-digit Staff PIN Code</p>
          <input
            type="password"
            placeholder="Default PIN: 1234"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #334155", marginBottom: "16px", textAlign: "center", fontSize: "18px" }}
          />
          <button type="submit" style={{ width: "100%", padding: "10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontWeight: "600", marginBottom: "8px" }}>
            ← Back to Student Portal
          </button>
          <h1>📋 Staff Queue Management Dashboard</h1>
        </div>
        <div style={{ background: "#dbeafe", color: "#1e40af", padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold" }}>
          🔴 Live Real-Time Queue Active
        </div>
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        {queues.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>No active queue tickets right now.</p>
        ) : (
          queues.map((item) => (
            <div key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              <div>
                <span style={{ background: "#2563eb", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontWeight: "bold", marginRight: "10px" }}>
                  {item.ticketNumber}
                </span>
                <strong style={{ fontSize: "18px" }}>{item.studentName}</strong> ({item.studentId})
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                  Department: <strong>{item.department}</strong> | Section: {item.block}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", background: item.status === "Serving" ? "#fef3c7" : item.status === "Done" ? "#dcfce7" : "#f1f5f9", color: item.status === "Serving" ? "#d97706" : item.status === "Done" ? "#16a34a" : "#475569" }}>
                  {item.status}
                </span>

                {item.status === "Waiting" && (
                  <button onClick={() => updateStatus(item.id, "Serving")} style={{ background: "#d97706", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                    Call / Serve
                  </button>
                )}

                {item.status === "Serving" && (
                  <button onClick={() => updateStatus(item.id, "Done")} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};