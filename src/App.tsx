import React, { useState, useEffect } from "react";
import { ref, push, onValue, set } from "firebase/database";
import { db } from "./firebase";
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
  Layers,
  UserCheck,
  Volume2,
  Activity,
  Wifi,
  ArrowUpRight
} from "lucide-react";
import type { StudentInfo, QueueInfo, DocumentRequest } from "./types";
import "./App.css";

const App: React.FC = () => {
  // Splash Screen State (4-second smooth intro)
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashExiting, setSplashExiting] = useState<boolean>(false);

  // Navigation & Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("home");

  // Flow State
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);

  // Form input state for onboarding
  const [formInput, setFormInput] = useState({
    name: "",
    studentId: "",
    course: "BS Information Technology",
    yearLevel: "2nd Year",
    block: "Block A",
  });

  // Student State
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
    "queue" | "balance" | "requestDoc" | "myRequests" | "about" | "staff" | null
  >(null);

  // Called Ticket Popup Alert State
  const [showTurnAlert, setShowTurnAlert] = useState<boolean>(false);
  const [calledDepartment, setCalledDepartment] = useState<string>("");

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

  // Staff State
  const [staffDept, setStaffDept] = useState<string>("Accounting");
  const [staffNextNum, setStaffNextNum] = useState<number>(107);

  // Document Requests State
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);

  // 4-second splash: keep the scene stable, then use a compositor-only crossfade
  useEffect(() => {
    // 0.0s - 3.2s: splash is fully visible.
    // 3.3s - 4.0s: lightweight opacity-only fade revealing a pre-rendered portal.
    const exitTimer = window.setTimeout(() => {
      setSplashExiting(true);
    }, 3300);

    const hideTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, 4000);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  // Toast Helper
  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Realtime Firebase Listener at Automatic Alert Trigger
  // Start it after the splash so network/state work cannot interrupt the intro transition.
  useEffect(() => {
    if (showSplash) return;

    const queueRef = ref(db, "currentQueue");

    const unsubscribe = onValue(queueRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const liveNowServing = data.nowServing || "#101";
        const liveDepartment = data.servingDepartment || "Accounting";

        setQueue((prevQueue) => {
          let newPeopleAhead = prevQueue.peopleAhead;

          if (prevQueue.yourNumber) {
            const myNum = parseInt(prevQueue.yourNumber.replace("#", ""));
            const currentNum = parseInt(liveNowServing.replace("#", ""));
            newPeopleAhead = Math.max(0, myNum - currentNum);

            // REALTIME ALERT CHECK: Kapag tumugma ang Ticket Number at Department!
            if (
              prevQueue.yourNumber === liveNowServing &&
              (prevQueue.department === liveDepartment || !prevQueue.department)
            ) {
              setCalledDepartment(liveDepartment);
              setShowTurnAlert(true);
            }
          }

          return {
            ...prevQueue,
            nowServing: liveNowServing,
            servingDepartment: liveDepartment,
            peopleAhead: newPeopleAhead,
          };
        });
      }
    });

    return () => unsubscribe();
  }, [showSplash]);

  // Onboarding Submit
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
    const generatedNum = `#${currentNum + Math.floor(Math.random() * 3) + 1}`;
    const calculatedAhead = parseInt(generatedNum.replace("#", "")) - currentNum;

    push(ref(db, "queues"), {
      ticketNumber: generatedNum,
      studentName: student.name,
      studentId: student.studentId,
      block: student.block,
      course: student.course,
      department: selectedDept,
      status: "Waiting",
      createdAt: Date.now()
    });

    setQueue({
      ...queue,
      yourNumber: generatedNum,
      department: selectedDept,
      peopleAhead: calculatedAhead,
    });

    setActiveModal(null);
    showToast(`Ticket ${generatedNum} generated for ${selectedDept}!`);
  };

  // Staff Call Next Handler
  const handleStaffCallNext = () => {
    const nextTicket = `#${staffNextNum}`;
    
    set(ref(db, "currentQueue"), {
      nowServing: nextTicket,
      servingDepartment: staffDept,
      updatedAt: Date.now()
    });

    setStaffNextNum(staffNextNum + 1);
    showToast(`Staff called ticket ${nextTicket} for ${staffDept}`);
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

  // Keep the portal fully rendered behind the opaque splash.
  // This avoids painting/mounting the login page during the fade itself.
  const portalTransitionClass = showSplash ? "portal-underlay" : "portal-ready";

  // Premium splash stays mounted above the portal so both screens can crossfade smoothly.
  const splashOverlay = showSplash ? (
      <div className={`splash-screen premium-splash ${splashExiting ? "splash-exit" : ""}`}>
        <div className="splash-grid" aria-hidden="true"></div>
        <div className="splash-noise" aria-hidden="true"></div>
        <div className="splash-vignette" aria-hidden="true"></div>

        <div className="splash-aurora aurora-one" aria-hidden="true"></div>
        <div className="splash-aurora aurora-two" aria-hidden="true"></div>
        <div className="splash-aurora aurora-three" aria-hidden="true"></div>

        <div className="splash-particles" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className={`particle particle-${index + 1}`}></span>
          ))}
        </div>

        <div className="splash-content premium-splash-content">
          <div className="splash-eyebrow">
            <Sparkles size={14} />
            <span>CCDI Sorsogon Digital Campus</span>
          </div>

          <div className="splash-logo-stage">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
            <div className="orbit-dot dot-one"></div>
            <div className="orbit-dot dot-two"></div>
            <div className="logo-beam"></div>

            <div className="splash-logo premium-logo">
              <div className="logo-glass"></div>
              <Building2 size={46} strokeWidth={1.85} />
            </div>
          </div>

          <div className="splash-copy">
            <h1 className="splash-title premium-title">
              <span className="title-line">WELCOME TO</span>
              <span className="title-brand">CCDI QUEUE</span>
            </h1>

            <p className="splash-subtitle premium-subtitle">
              Smart Queueing & Student Services System
            </p>
          </div>

          <div className="splash-loader-wrap">
            <div className="loader-topline">
              <span className="loader-status">
                <span className="status-dot"></span>
                Initializing portal
              </span>
              <span className="loader-percent">Loading</span>
            </div>

            <div className="splash-loader-bar premium-loader">
              <div className="splash-loader-fill premium-loader-fill"></div>
              <div className="loader-shine"></div>
            </div>

            <div className="splash-feature-row">
              <span><ShieldCheck size={13} /> Secure</span>
              <span><Sparkles size={13} /> Realtime</span>
              <span><Building2 size={13} /> Student Services</span>
            </div>
          </div>
        </div>

        <div className="splash-scanline" aria-hidden="true"></div>
      </div>
  ) : null;

  // Render Onboarding Verification Form
  if (!isSetupComplete) {
    return (
      <>
        {splashOverlay}
        <div
          className={`onboarding-container ${isDarkMode ? "dark" : ""} ${portalTransitionClass}`}
        >
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
        <div className="bg-glow-3"></div>

        <div className="onboarding-card hero-glass-card">
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
      </>
    );
  }

  return (
    <>
      {splashOverlay}
      <div
        className={`dashboard-container ${isDarkMode ? "dark" : ""} ${portalTransitionClass}`}
      >
      {/* Toast Notification */}
      {notification && (
        <div className="toast-notification">
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
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
          <span className="nav-section-label">Student Services</span>

          <button
            className={`nav-item ${activeTab === "home" ? "active" : ""}`}
            onClick={() => setActiveTab("home")}
          >
            <span className="nav-icon"><Home size={18} /></span>
            <span>Home</span>
          </button>
          <button
            className={`nav-item ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("queue");
              setActiveModal("queue");
            }}
          >
            <span className="nav-icon"><Ticket size={18} /></span>
            <span>Get Number</span>
          </button>
          <button
            className={`nav-item ${activeTab === "balance" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("balance");
              setActiveModal("balance");
            }}
          >
            <span className="nav-icon"><BarChart2 size={18} /></span>
            <span>Check Balance</span>
          </button>
          <button
            className={`nav-item ${activeTab === "requestDoc" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("requestDoc");
              setActiveModal("requestDoc");
            }}
          >
            <span className="nav-icon"><FileText size={18} /></span>
            <span>Request Document</span>
          </button>
          <button
            className={`nav-item ${activeTab === "myRequests" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("myRequests");
              setActiveModal("myRequests");
            }}
          >
            <span className="nav-icon"><FolderCheck size={18} /></span>
            <span>My Request</span>
          </button>

          <div className="nav-divider"></div>
          <span className="nav-section-label">System</span>

          <button
            className={`nav-item ${activeTab === "staff" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("staff");
              setActiveModal("staff");
            }}
          >
            <span className="nav-icon"><UserCheck size={18} /></span>
            <span>Staff Console</span>
          </button>

          <button
            className={`nav-item ${activeTab === "about" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("about");
              setActiveModal("about");
            }}
          >
            <span className="nav-icon"><Info size={18} /></span>
            <span>About</span>
          </button>
        </nav>

        <div className="sidebar-system-card">
          <div className="system-status-icon"><Activity size={16} /></div>
          <div className="system-status-copy">
            <strong>All systems operational</strong>
            <span><i></i> Live services connected</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <div className="header-context">
            <div className="header-title-row">
              <span className="header-kicker"><Activity size={13} /> Student Dashboard</span>
              <span className="header-online"><i></i> System Online</span>
            </div>
            <p>CCDI Sorsogon • Queueing & Student Services</p>
          </div>

          <div className="header-actions">
            <button
              className="theme-toggle-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Toggle Theme"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button className="header-user" type="button" aria-label="Student profile">
              <div className="avatar">
                <User size={20} />
              </div>
              <div className="header-user-copy">
                <span className="user-name">{student.name}</span>
                <span className="user-role">{student.studentId} • {student.block}</span>
              </div>
              <ChevronDown size={16} className="chevron-icon" />
            </button>

            <button
              className="notification-btn"
              type="button"
              aria-label="Notifications"
              onClick={() => showToast("No new notifications")}
            >
              <Bell size={20} className="bell-icon" />
              <span className="notification-dot"></span>
            </button>
          </div>
        </header>

        <div className="content-body">
          {/* Hero Banner */}
          <section className="hero-banner">
            <div className="hero-mesh" aria-hidden="true"></div>
            <div className="hero-orbit hero-orbit-one" aria-hidden="true"></div>
            <div className="hero-orbit hero-orbit-two" aria-hidden="true"></div>

            <div className="banner-left">
              <div className="hero-status-pill">
                <span className="hero-status-dot"></span>
                Student Services Portal • Live
              </div>

              <h1>Welcome back,</h1>
              <div className="user-name-title">{student.name}!</div>

              <div className="hero-role-pill">
                <GraduationCap size={16} />
                <span>{student.course}</span>
                <span className="hero-role-divider"></span>
                <span>{student.yearLevel}</span>
                <span className="hero-role-divider"></span>
                <span>{student.block}</span>
              </div>

              <div className="hero-meta-row">
                <span><IdCard size={14} /> ID: {student.studentId}</span>
                <span><Wifi size={14} /> Realtime sync active</span>
              </div>
            </div>

            <div className="banner-right">
              <div className="hero-live-card">
                <div className="hero-live-card-top">
                  <span>Current Queue</span>
                  <span className="hero-live-badge"><i></i> LIVE</span>
                </div>
                <span className="hero-live-label">Now Serving</span>
                <strong className="hero-live-number">{queue.nowServing}</strong>
                <span className="hero-live-dept">{queue.servingDepartment}</span>
              </div>

              <div className="hero-campus-signature">
                <span className="hero-quote">“Your Future Starts Here.”</span>
                <strong>CCDI</strong>
                <small>SORSOGON CAMPUS</small>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="services-section">
            <div className="section-heading-row">
              <div>
                <span className="section-eyebrow">Quick Access</span>
                <h2 className="section-heading-title">Student Services</h2>
                <p>Access your most-used services in one place.</p>
              </div>
              <span className="section-count">4 services</span>
            </div>

            <div className="cards-grid">
              <button
                type="button"
                className="service-card service-blue"
                onClick={() => {
                  setActiveTab("queue");
                  setActiveModal("queue");
                }}
              >
                <div className="card-left">
                  <div className="icon-box blue"><Ticket size={24} /></div>
                  <div className="card-text">
                    <span className="card-eyebrow">Queue</span>
                    <h3>Get Number</h3>
                    <p>Join a service queue instantly.</p>
                  </div>
                </div>
                <div className="arrow-box"><ArrowUpRight size={18} /></div>
              </button>

              <button
                type="button"
                className="service-card service-green"
                onClick={() => {
                  setActiveTab("balance");
                  setActiveModal("balance");
                }}
              >
                <div className="card-left">
                  <div className="icon-box green"><BarChart2 size={24} /></div>
                  <div className="card-text">
                    <span className="card-eyebrow">Finance</span>
                    <h3>Check Balance</h3>
                    <p>View tuition and outstanding fees.</p>
                  </div>
                </div>
                <div className="arrow-box"><ArrowUpRight size={18} /></div>
              </button>

              <button
                type="button"
                className="service-card service-orange"
                onClick={() => {
                  setActiveTab("requestDoc");
                  setActiveModal("requestDoc");
                }}
              >
                <div className="card-left">
                  <div className="icon-box orange"><FileText size={24} /></div>
                  <div className="card-text">
                    <span className="card-eyebrow">Registrar</span>
                    <h3>Request Document</h3>
                    <p>Request official school documents.</p>
                  </div>
                </div>
                <div className="arrow-box"><ArrowUpRight size={18} /></div>
              </button>

              <button
                type="button"
                className="service-card service-purple"
                onClick={() => {
                  setActiveTab("myRequests");
                  setActiveModal("myRequests");
                }}
              >
                <div className="card-left">
                  <div className="icon-box purple"><FolderCheck size={24} /></div>
                  <div className="card-text">
                    <span className="card-eyebrow">Tracking</span>
                    <h3>My Requests</h3>
                    <p>Track your submitted document requests.</p>
                  </div>
                </div>
                <div className="arrow-box"><ArrowUpRight size={18} /></div>
              </button>
            </div>
          </section>

          {/* Real-time Queue Section */}
          <section className="queue-section">
            <div className="queue-header">
              <div className="queue-title-wrap">
                <div className="queue-title-icon"><Users size={20} /></div>
                <div>
                  <span className="section-eyebrow">Realtime Monitor</span>
                  <h3 className="section-title">Current Queue</h3>
                </div>
              </div>

              <div className="queue-meta">
                <span className="live-badge"><span className="live-dot"></span> Live Realtime</span>
                <span className="sync-copy"><Wifi size={14} /> CCDI Live Sync</span>
              </div>
            </div>

            <p className="queue-subtext">
              Live queue status for Accounting, Cashier, and Registrar Services.
            </p>

            <div className="queue-grid">
              <div className="queue-card serving">
                <div className="queue-card-head">
                  <span>Now Serving</span>
                  <span className="queue-card-icon"><Activity size={17} /></span>
                </div>
                <div className="number">{queue.nowServing}</div>
                <div className="sub-info">{queue.servingDepartment}</div>
                <div className="queue-card-foot"><span className="queue-pulse"></span> Counter is currently active</div>
              </div>

              <div className="queue-card ticket">
                <div className="queue-card-head">
                  <span>Your Number</span>
                  <span className="queue-card-icon"><Ticket size={17} /></span>
                </div>
                <div className={`number ${!queue.yourNumber ? "number-empty" : ""}`}>
                  {queue.yourNumber ? queue.yourNumber : "No Ticket"}
                </div>
                <div className="sub-info">
                  {queue.yourNumber ? (
                    <><Users size={14} /> {queue.peopleAhead} ahead • {queue.department}</>
                  ) : (
                    "You are not currently in a queue"
                  )}
                </div>
                {!queue.yourNumber && (
                  <button
                    type="button"
                    className="queue-inline-action"
                    onClick={() => {
                      setActiveTab("queue");
                      setActiveModal("queue");
                    }}
                  >
                    Get a queue number <ArrowRight size={15} />
                  </button>
                )}
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

      {/* POP-UP ALERT MODAL: IT'S YOUR TURN! */}
      {showTurnAlert && (
        <div className="modal-overlay turn-alert-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content turn-alert-content">
            <div className="turn-alert-icon"><Volume2 size={34} /></div>
            <span className="turn-alert-kicker">QUEUE NOTIFICATION</span>
            <h2 className="turn-alert-title">Ikaw na ang Tinatawag!</h2>
            <p className="turn-alert-desc">
              Pumunta na agad sa counter ng <strong>{calledDepartment}</strong>.
            </p>
            <div className="turn-ticket-number">{queue.yourNumber}</div>
            <button
              className="btn-primary"
              type="button"
              onClick={() => setShowTurnAlert(false)}
            >
              <span>Proceed to Counter</span>
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}

      {/* Standard Modals Container */}
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
                      <option value="Cashier">Cashier</option>
                      <option value="Accounting">Accounting Office</option>
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

            {/* Modal: Staff Controller */}
            {activeModal === "staff" && (
              <div>
                <h2>Staff Control Panel</h2>
                <p className="modal-desc">
                  Gamitin ito para tumawag ng mga bagong ticket number papunta sa dashboard ng mga estudyante.
                </p>

                <div className="form-group" style={{ marginTop: "15px" }}>
                  <label>Staff Counter / Department:</label>
                  <select
                    value={staffDept}
                    onChange={(e) => setStaffDept(e.target.value)}
                    className="form-control"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Accounting">Accounting Office</option>
                    <option value="Registrar">Registrar Office</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Next Ticket to Call:</label>
                  <input
                    type="number"
                    value={staffNextNum}
                    onChange={(e) => setStaffNextNum(parseInt(e.target.value) || 100)}
                    className="form-control"
                  />
                </div>

                <button
                  onClick={handleStaffCallNext}
                  className="btn-primary"
                  style={{ width: "100%", padding: "12px", marginTop: "10px", fontWeight: "bold" }}
                >
                  Call Ticket #{staffNextNum} ({staffDept})
                </button>
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
    </>
  );
};

export default App;