import React, { useState, useEffect } from "react";
import {
  Home,
  Ticket,
  BarChart2,
  FileText,
  FolderCheck,
  Info,
  ChevronRight,
  Bell,
  Users,
  Building2,
  ChevronDown,
  User,
  Sun,
  Moon,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  IdCard,
  BookOpen,
  Layers
} from "lucide-react";
import type { StudentInfo, QueueInfo, DocumentRequest } from "./types";
import "./App.css";

const App: React.FC = () => {
  // Navigation & Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("home");

  // Flow State: false if needs onboarding, true when submitted
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);

  // Form input state for onboarding
  const [formInput, setFormInput] = useState({
    name: "",
    studentId: "",
    course: "BS Information Technology",
    yearLevel: "2nd Year",
    block: "Block A",
  });

  // Student State (populated after setup)
  const [student, setStudent] = useState<StudentInfo>({
    name: "",
    studentId: "",
    course: "",
    yearLevel: "",
    block: "",
    role: "Student",
    balance: {
      tuition: 14500,
      miscFees: 3200,
      totalPaid: 9000,
      remainingBalance: 8700,
    },
  });

  // Modal States
  const [activeModal, setActiveModal] = useState<
    "queue" | "balance" | "requestDoc" | "myRequests" | "about" | null
  >(null);

  // Queue & Action States
  const [selectedDept, setSelectedDept] = useState<string>("Accounting");
  const [selectedDoc, setSelectedDoc] = useState<string>("Certificate of Enrollment (COE)");
  const [docCopies, setDocCopies] = useState<number>(1);
  const [notification, setNotification] = useState<string | null>(null);

  // Dynamic Queue State
  const [queue, setQueue] = useState<QueueInfo>({
    nowServing: "#101",
    servingDepartment: "Accounting",
    yourNumber: null,
    peopleAhead: 0,
    department: null,
  });

  // Document Requests State
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);

  // Toast Helper
  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Live Queue Progression Simulation
  useEffect(() => {
    if (!isSetupComplete) return;

    const interval = setInterval(() => {
      setQueue((prevQueue) => {
        const currentNum = parseInt(prevQueue.nowServing.replace("#", ""));
        const nextNum = currentNum + 1;
        const newNowServing = `#${nextNum}`;

        let newPeopleAhead = prevQueue.peopleAhead;
        if (prevQueue.yourNumber) {
          const myNum = parseInt(prevQueue.yourNumber.replace("#", ""));
          newPeopleAhead = Math.max(0, myNum - nextNum);
        }

        return {
          ...prevQueue,
          nowServing: newNowServing,
          peopleAhead: newPeopleAhead,
        };
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [isSetupComplete]);

  // Handle Onboarding Setup Form Submit
  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInput.name.trim() || !formInput.studentId.trim()) {
      alert("Please fill in your Full Name and Student ID.");
      return;
    }

    setStudent({
      ...student,
      name: formInput.name,
      studentId: formInput.studentId,
      course: formInput.course,
      yearLevel: formInput.yearLevel,
      block: formInput.block,
    });

    setIsSetupComplete(true);
    showToast(`Welcome, ${formInput.name}!`);
  };

  // Queue Ticket Handler
  const handleGetQueueNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const currentNum = parseInt(queue.nowServing.replace("#", ""));
    const generatedNum = `#${currentNum + Math.floor(Math.random() * 4) + 2}`;
    const calculatedAhead = parseInt(generatedNum.replace("#", "")) - currentNum;

    setQueue({
      ...queue,
      yourNumber: generatedNum,
      department: selectedDept,
      peopleAhead: calculatedAhead,
    });

    setActiveModal(null);
    showToast(`Ticket ${generatedNum} generated for ${selectedDept}!`);
  };

  // Document Request Handler
  const handleCreateDocumentRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq: DocumentRequest = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      documentName: selectedDoc,
      dateRequested: "Today",
      status: "Pending",
      copies: docCopies,
    };

    setDocumentRequests([newReq, ...documentRequests]);
    setActiveModal(null);
    showToast(`Request submitted for ${selectedDoc}.`);
  };

  // Modern Upgraded Onboarding Screen (If not complete)
  if (!isSetupComplete) {
    return (
      <div className={`onboarding-container ${isDarkMode ? "dark" : ""}`}>
        {/* Ambient Glowing Orbs */}
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
        <div className="bg-glow-3"></div>

        <div className="onboarding-card hero-glass-card">
          {/* Top Badge */}
          <div className="portal-badge">
            <Sparkles size={14} className="badge-sparkle" />
            <span>CCDI Student Portal Verification</span>
          </div>

          <div className="onboarding-header">
            <div className="logo-icon-large animated-logo">
              <Building2 size={38} />
            </div>
            <h2 className="animated-title">
              Welcome to <span>CCDI Sorsogon</span>
            </h2>
            <p className="animated-subtitle">
              Paki-fill up ang iyong impormasyon para ma-access ang iyong Queueing & Student Services Portal.
            </p>
          </div>

          <form onSubmit={handleSetupSubmit} className="onboarding-form">
            <div className="form-group animated-field" style={{ animationDelay: "0.1s" }}>
              <label>
                <User size={14} /> Full Name
              </label>
              <div className="input-with-icon">
                <input
                  type="text"
                  className="form-control styled-input"
                  placeholder="e.g. Ace Estrabela"
                  value={formInput.name}
                  onChange={(e) => setFormInput({ ...formInput, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group animated-field" style={{ animationDelay: "0.2s" }}>
              <label>
                <IdCard size={14} /> Student ID Number
              </label>
              <div className="input-with-icon">
                <input
                  type="text"
                  className="form-control styled-input"
                  placeholder="e.g. 2026-CCDI-0192"
                  value={formInput.studentId}
                  onChange={(e) => setFormInput({ ...formInput, studentId: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row animated-field" style={{ animationDelay: "0.3s" }}>
              <div className="form-group">
                <label>
                  <BookOpen size={14} /> Course
                </label>
                <select
                  className="form-control styled-input"
                  value={formInput.course}
                  onChange={(e) => setFormInput({ ...formInput, course: e.target.value })}
                >
                  <option value="BS Information Technology">BS Info Technology</option>
                  <option value="BS Computer Science">BS Computer Science</option>
                  <option value="Associate in Computer Tech">Associate in Comp Tech</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <GraduationCap size={14} /> Year Level
                </label>
                <select
                  className="form-control styled-input"
                  value={formInput.yearLevel}
                  onChange={(e) => setFormInput({ ...formInput, yearLevel: e.target.value })}
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
            </div>

            <div className="form-group animated-field" style={{ animationDelay: "0.4s" }}>
              <label>
                <Layers size={14} /> Block / Section
              </label>
              <select
                className="form-control styled-input"
                value={formInput.block}
                onChange={(e) => setFormInput({ ...formInput, block: e.target.value })}
              >
                <option value="Block A">Block A</option>
                <option value="Block B">Block B</option>
                <option value="Block C">Block C</option>
                <option value="Section 1">Section 1</option>
              </select>
            </div>

            <div className="security-note">
              <ShieldCheck size={16} />
              <span>Your student information is encrypted and secure.</span>
            </div>

            <button type="submit" className="btn-primary btn-large pulse-hover-btn animated-field" style={{ animationDelay: "0.5s" }}>
              <span>Enter Portal</span>
              <ArrowRight size={18} className="arrow-icon-anim" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className={`dashboard-container ${isDarkMode ? "dark" : ""}`}>
      {/* Toast Notification */}
      {notification && (
        <div className="toast-notification">
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-icon">
            <Building2 size={24} />
          </div>
          <div className="brand-text">
            <h2>CCDI</h2>
            <p>Student Services</p>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${activeTab === "home" ? "active" : ""}`}
            onClick={() => setActiveTab("home")}
          >
            <Home size={18} /> Home
          </button>
          <button
            className={`nav-item ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("queue");
              setActiveModal("queue");
            }}
          >
            <Ticket size={18} /> Get Number
          </button>
          <button
            className={`nav-item ${activeTab === "balance" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("balance");
              setActiveModal("balance");
            }}
          >
            <BarChart2 size={18} /> Check Balance
          </button>
          <button
            className={`nav-item ${activeTab === "requestDoc" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("requestDoc");
              setActiveModal("requestDoc");
            }}
          >
            <FileText size={18} /> Request Document
          </button>
          <button
            className={`nav-item ${activeTab === "myRequests" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("myRequests");
              setActiveModal("myRequests");
            }}
          >
            <FolderCheck size={18} /> My Request
          </button>

          <div className="nav-divider"></div>

          <button
            className={`nav-item ${activeTab === "about" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("about");
              setActiveModal("about");
            }}
          >
            <Info size={18} /> About
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <button
            className="theme-toggle-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="header-user">
            <div className="avatar">
              <User size={20} />
            </div>
            <div>
              <span className="user-name">{student.name}</span>
              <span className="user-role">{student.studentId} • {student.block}</span>
            </div>
            <ChevronDown size={16} className="chevron-icon" />
          </div>
          <Bell
            size={20}
            className="bell-icon"
            onClick={() => showToast("No new notifications")}
          />
        </header>

        <div className="content-body">
          {/* Hero Banner */}
          <section className="hero-banner">
            <div className="banner-left">
              <h1>Welcome,</h1>
              <div className="user-name-title">{student.name}!</div>
              <p className="role">
                <GraduationCap size={16} style={{ display: "inline", marginRight: "6px" }} />
                {student.course} ({student.yearLevel} - {student.block})
              </p>
              <p className="subtext">
                ID: {student.studentId} | CCDI Sorsogon Queueing & Services System
              </p>
            </div>
            <div className="banner-right">
              <div className="banner-quote">"Your Future Starts Here."</div>
              <div className="building-label">
                <span>CCDI</span>
                <span style={{ fontSize: "11px", opacity: 0.8 }}>SORSOGON CAMPUS</span>
              </div>
            </div>
          </section>

          {/* Cards Grid */}
          <section className="cards-grid">
            <div className="service-card" onClick={() => setActiveModal("queue")}>
              <div className="card-left">
                <div className="icon-box blue">
                  <Ticket size={24} />
                </div>
                <div className="card-text">
                  <h3>Get Number</h3>
                  <p>Get a queue number for your chosen service.</p>
                </div>
              </div>
              <div className="arrow-box">
                <ChevronRight size={18} />
              </div>
            </div>

            <div className="service-card" onClick={() => setActiveModal("balance")}>
              <div className="card-left">
                <div className="icon-box green">
                  <BarChart2 size={24} />
                </div>
                <div className="card-text">
                  <h3>Check Balance</h3>
                  <p>Check your account balance and other fees.</p>
                </div>
              </div>
              <div className="arrow-box">
                <ChevronRight size={18} />
              </div>
            </div>

            <div className="service-card" onClick={() => setActiveModal("requestDoc")}>
              <div className="card-left">
                <div className="icon-box orange">
                  <FileText size={24} />
                </div>
                <div className="card-text">
                  <h3>Request Document</h3>
                  <p>Submit a request for required documents.</p>
                </div>
              </div>
              <div className="arrow-box">
                <ChevronRight size={18} />
              </div>
            </div>

            <div className="service-card" onClick={() => setActiveModal("myRequests")}>
              <div className="card-left">
                <div className="icon-box purple">
                  <FolderCheck size={24} />
                </div>
                <div className="card-text">
                  <h3>My Request</h3>
                  <p>View the status of your document requests.</p>
                </div>
              </div>
              <div className="arrow-box">
                <ChevronRight size={18} />
              </div>
            </div>
          </section>

          {/* Queue Section */}
          <section className="queue-section">
            <div className="queue-header">
              <div className="queue-title">
                <Users size={20} className="queue-icon" />
                <h3 className="section-title">Current Queue</h3>
              </div>
              <div className="queue-meta">
                <span className="live-badge">
                  <span className="live-dot"></span> Live Now
                </span>
                <span>Sep 13, 2026 10:33 PM</span>
              </div>
            </div>

            <p className="queue-subtext">
              Live queue status for Accounting, Cashier, and Registrar Services
            </p>

            <div className="queue-grid">
              <div className="queue-card serving">
                <h4>Now Serving</h4>
                <div className="number">{queue.nowServing}</div>
                <div className="sub-info">{queue.servingDepartment}</div>
              </div>

              <div className="queue-card ticket">
                <h4>Your Number</h4>
                <div className="number">
                  {queue.yourNumber ? queue.yourNumber : "No Ticket"}
                </div>
                <div className="sub-info">
                  {queue.yourNumber ? (
                    <>
                      <Users size={14} /> {queue.peopleAhead} people on line (
                      {queue.department})
                    </>
                  ) : (
                    "Click 'Get Number' to queue"
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="footer">
            <p>© 2026 CCDI Sorsogon. All rights reserved.</p>
            <p>Opportunities. People. Better Tomorrow.</p>
          </footer>
        </div>
      </main>

      {/* Modals */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              <X size={20} />
            </button>

            {/* Modal: Get Number */}
            {activeModal === "queue" && (
              <div>
                <h2>Get Queue Number</h2>
                <p className="modal-desc">
                  Select department for <strong>{student.name}</strong> ({student.block}):
                </p>
                <form onSubmit={handleGetQueueNumber}>
                  <div className="form-group">
                    <label>Department:</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="form-control"
                    >
                      <option value="Accounting">Accounting Office</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Registrar">Registrar Office</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary">
                    Generate Ticket
                  </button>
                </form>
              </div>
            )}

            {/* Modal: Check Balance */}
            {activeModal === "balance" && (
              <div>
                <h2>Account Statement</h2>
                <p className="modal-desc">
                  Student: <strong>{student.name}</strong> ({student.studentId})
                </p>

                <div className="balance-breakdown">
                  <div className="balance-row">
                    <span>Tuition Fee:</span>
                    <span>₱{student.balance.tuition.toLocaleString()}</span>
                  </div>
                  <div className="balance-row">
                    <span>Miscellaneous Fees:</span>
                    <span>₱{student.balance.miscFees.toLocaleString()}</span>
                  </div>
                  <div className="balance-row">
                    <span>Total Amount Paid:</span>
                    <span style={{ color: "#16a34a" }}>
                      - ₱{student.balance.totalPaid.toLocaleString()}
                    </span>
                  </div>
                  <div className="balance-row total">
                    <span>Remaining Balance:</span>
                    <span>₱{student.balance.remainingBalance.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => setActiveModal(null)}
                  style={{ marginTop: "20px" }}
                >
                  Close Statement
                </button>
              </div>
            )}

            {/* Modal: Request Document */}
            {activeModal === "requestDoc" && (
              <div>
                <h2>Request Official Document</h2>
                <p className="modal-desc">
                  Request for: <strong>{student.name}</strong> ({student.course})
                </p>

                <form onSubmit={handleCreateDocumentRequest}>
                  <div className="form-group">
                    <label>Document Type:</label>
                    <select
                      value={selectedDoc}
                      onChange={(e) => setSelectedDoc(e.target.value)}
                      className="form-control"
                    >
                      <option value="Certificate of Enrollment (COE)">
                        Certificate of Enrollment (COE)
                      </option>
                      <option value="Transcript of Records (TOR)">
                        Transcript of Records (TOR)
                      </option>
                      <option value="Certified True Copy of Grades">
                        Certified True Copy of Grades
                      </option>
                      <option value="Good Moral Certificate">
                        Good Moral Certificate
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Number of Copies:</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={docCopies}
                      onChange={(e) => setDocCopies(parseInt(e.target.value))}
                      className="form-control"
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    Submit Request
                  </button>
                </form>
              </div>
            )}

            {/* Modal: My Requests */}
            {activeModal === "myRequests" && (
              <div>
                <h2>My Document Requests</h2>
                <p className="modal-desc">Active Requests for {student.name}</p>

                {documentRequests.length === 0 ? (
                  <p style={{ fontSize: "14px", color: "#6b7280", textAlign: "center", padding: "20px" }}>
                    No active document requests yet.
                  </p>
                ) : (
                  <div className="requests-list">
                    {documentRequests.map((req) => (
                      <div className="request-item-card" key={req.id}>
                        <div>
                          <strong>{req.documentName}</strong>
                          <p style={{ fontSize: "12px", color: "#6b7280" }}>
                            ID: {req.id} • {req.copies} Copy/ies • {req.dateRequested}
                          </p>
                        </div>
                        <span className={`status-pill ${req.status.toLowerCase().replace(/\s+/g, "-")}`}>
                          {req.status === "Ready for Pickup" && <CheckCircle2 size={12} />}
                          {req.status === "Processing" && <Clock size={12} />}
                          {req.status === "Pending" && <AlertCircle size={12} />}
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal: About */}
            {activeModal === "about" && (
              <div>
                <h2>About CCDI Student Portal</h2>
                <p className="modal-desc" style={{ marginTop: "12px", lineHeight: 1.5 }}>
                  The CCDI Student Services & Queueing System allows students like{" "}
                  <strong>{student.name}</strong> ({student.course} - {student.block}) to queue up efficiently and request documents online.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;