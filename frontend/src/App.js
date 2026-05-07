import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { LRUCache, Queue, mergeSort } from "./dsa";
import "./App.css";

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// Instantiate LRU Cache outside to persist across renders
const sessionCache = new LRUCache(5);

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sortMethod, setSortMethod] = useState("newest"); // "newest", "longest", "shortest"

  // Ultimate Suite State
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Enterprise Edition State
  const [tutorPersona, setTutorPersona] = useState("Supportive Peer");
  const [showDashboard, setShowDashboard] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentlyReading, setCurrentlyReading] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const chatEndRef = useRef(null);
  const typingQueueRef = useRef(new Queue());
  const typingIntervalRef = useRef(null);

  const API = "http://127.0.0.1:8000";

  const fetchSessions = async (currentSort = sortMethod) => {
    try {
      const res = await axios.get(`${API}/chat/sessions`);
      let rawSessions = res.data.sessions || []; // Array of {session_id, msg_count}
      
      // DSA: Apply Custom Merge Sort based on dropdown
      let sortedSessions = [];
      if (currentSort === "newest") {
        // Default backend order is newest first
        sortedSessions = rawSessions;
      } else if (currentSort === "longest") {
        sortedSessions = mergeSort(rawSessions, (a, b) => b.msg_count - a.msg_count);
      } else if (currentSort === "shortest") {
        sortedSessions = mergeSort(rawSessions, (a, b) => a.msg_count - b.msg_count);
      }

      setSessions(sortedSessions);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setSortMethod(val);
    fetchSessions(val);
  };

  const loadSession = async (sessionId) => {
    // DSA: Check LRU Cache first
    const cachedHistory = sessionCache.get(sessionId);
    if (cachedHistory) {
      setMessages(cachedHistory);
      setCurrentSessionId(sessionId);
      setUploadedFile(null);
      return;
    }

    // Fallback to API if not in cache
    try {
      const res = await axios.get(`${API}/chat/history/${sessionId}`);
      const history = res.data.history || [];
      setMessages(history);
      setCurrentSessionId(sessionId);
      setUploadedFile(null);
      
      // Store in Cache
      sessionCache.put(sessionId, history);
    } catch (err) {
      console.error("Failed to load session history", err);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setUploadedFile(null);
    setCurrentSessionId(generateId());
    fetchSessions();
  };

  useEffect(() => {
    let interval = null;
    if (isPomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => setPomodoroTime((prev) => prev - 1), 1000);
    } else if (pomodoroTime === 0) {
      setIsPomodoroActive(false);
      alert("Pomodoro session finished! Time for a break. ☕");
    }
    return () => clearInterval(interval);
  }, [isPomodoroActive, pomodoroTime]);

  const togglePomodoro = () => setIsPomodoroActive(!isPomodoroActive);
  const resetPomodoro = () => {
    setIsPomodoroActive(false);
    setPomodoroTime(25 * 60);
  };

  const speakText = (text, msgId) => {
    if (!window.speechSynthesis) return;
    
    if (currentlyReading === msgId) {
      window.speechSynthesis.cancel();
      setCurrentlyReading(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setCurrentlyReading(null);
    
    setCurrentlyReading(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const toggleGlobalMute = () => {
    if (!isMuted) window.speechSynthesis.cancel();
    setIsMuted(!isMuted);
  };

  const getFlashcards = async (context) => {
    try {
      const res = await axios.post(`${API}/chat/flashcards`, { context });
      if (res.data.flashcards && res.data.flashcards.length > 0) {
        setFlashcards(res.data.flashcards);
        setShowFlashcards(true);
        setActiveCardIndex(0);
        setIsFlipped(false);
      }
    } catch (err) {
      console.error("Failed to generate flashcards", err);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload({ target: { files: [file] } });
  };

  const exportChat = () => {
    const content = messages.map(m => `**${m.role.toUpperCase()}**: ${m.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study_guide_${currentSessionId}.md`;
    a.click();
  };

  const exportFlashcards = () => {
    const csv = "Front,Back\n" + flashcards.map(c => `"${c.front}","${c.back}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards_${currentSessionId}.csv`;
    a.click();
  };

  useEffect(() => {
    fetchSessions();
    if (!currentSessionId) {
      setCurrentSessionId(generateId());
    }
  }, []);

  const renderMarkdown = (text) => {
    if (!text) return null;
    
    // Simple custom regex-based markdown parser for "Pro" feel
    const lines = text.split('\n');
    let inList = false;
    let listType = null;

    return lines.map((line, idx) => {
      // Bold
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Inline code
      formattedLine = formattedLine.replace(/`(.*?)`/g, '<code>$1</code>');

      // Headers
      if (line.startsWith('### ')) return <h3 key={idx}>{line.replace('### ', '')}</h3>;
      if (line.startsWith('## ')) return <h2 key={idx}>{line.replace('## ', '')}</h2>;
      if (line.startsWith('# ')) return <h1 key={idx}>{line.replace('# ', '')}</h1>;

      // Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s/, '') }} />;
      }
      if (/^\d+\.\s/.test(line)) {
        return <li key={idx} dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^\d+\.\s/, '') }} />;
      }

      // Paragraphs
      if (line.trim() === '') return <br key={idx} />;
      
      return <p key={idx} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
    });
  };

  const sendMessage = async (customMessage = null) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim()) return;

    const userMsg = { role: "user", content: textToSend };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);

    if (!customMessage) setInput("");

    try {
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = generateId();
        setCurrentSessionId(sessionId);
      }

      const endpoint = uploadedFile ? `${API}/pdf/ask` : `${API}/chat/ask`;

      // Update cache optimistically
      sessionCache.put(sessionId, newMsgs);

      const res = await axios.post(endpoint, {
        message: textToSend,
        session_id: sessionId,
        persona: tutorPersona
      });

      // DSA: Typing Effect using Queue
      const botText = res.data.answer;
      setMessages((prev) => [...prev, { role: "assistant", content: "", isTyping: true }]);

      for (let i = 0; i < botText.length; i++) {
        typingQueueRef.current.enqueue(botText[i]);
      }

      if (!typingIntervalRef.current) {
        typingIntervalRef.current = setInterval(() => {
          if (!typingQueueRef.current.isEmpty()) {
            const char = typingQueueRef.current.dequeue();
            setMessages((prev) => {
              const lastIdx = prev.length - 1;
              if (lastIdx < 0) return prev;
              const last = prev[lastIdx];
              if (last && last.isTyping) {
                const updatedLast = { ...last, content: last.content + char };
                const updated = [...prev];
                updated[lastIdx] = updatedLast;
                return updated;
              }
              return prev;
            });
          } else {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
            
            // Finalize message and update cache
            setMessages((prev) => {
              const lastIdx = prev.length - 1;
              if (lastIdx < 0) return prev;
              const last = prev[lastIdx];
              if (last && last.isTyping) {
                const updatedLast = { ...last, isTyping: false };
                const updated = [...prev];
                updated[lastIdx] = updatedLast;
                sessionCache.put(sessionId, updated);
                return updated;
              }
              return prev;
            });
            fetchSessions();
          }
        }, 15); // 15ms per character
      }

    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Error: Could not connect to server." },
      ]);
    }
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat?")) return;
    try {
      await axios.delete(`${API}/chat/session/${sessionId}`);
      sessionCache.put(sessionId, null); // Clear from cache
      if (currentSessionId === sessionId) {
        setMessages([]);
        setCurrentSessionId(generateId());
      }
      fetchSessions();
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const clearAllSessions = async () => {
    if (!window.confirm("Are you sure you want to delete ALL chat history? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/chat/sessions/all`);
      setMessages([]);
      setCurrentSessionId(generateId());
      fetchSessions();
    } catch (err) {
      console.error("Failed to clear sessions", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadedFile(null);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const sessionIdForUpload = currentSessionId || generateId();
      if (!currentSessionId) setCurrentSessionId(sessionIdForUpload);

      await axios.post(`${API}/pdf/upload`, formData, {
        params: { session_id: sessionIdForUpload },
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedFile(file.name);
      
      setMessages([{
        role: "assistant",
        content: `✅ Uploaded: ${file.name}. You can now ask questions about it, or use the buttons to summarize and generate a quiz.`,
      }]);
      fetchSessions();

    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to upload document");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append("file", audioBlob, "voice.webm");

          try {
            const res = await axios.post(`${API}/chat/transcribe`, formData, {
              headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data.text) {
              setInput((prev) => prev + (prev ? " " : "") + res.data.text);
            }
          } catch (err) {
            console.error("Transcription error", err);
            alert("Failed to transcribe audio.");
          }
          
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied", err);
        alert("Please allow microphone access to use voice typing.");
      }
    }
  };

  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Could not access camera.");
      setIsCameraOpen(false);
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "camera-snapshot.jpg", { type: "image/jpeg" });
          handleFileUpload({ target: { files: [file] } });
        }
      }, "image/jpeg", 0.9);
      
      closeCamera();
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    if (autoScroll && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <h2>✨ AI Study Helper</h2>
        <button className="new-chat" onClick={startNewChat}>
          + New Chat
        </button>

        <div className="enterprise-section">
          <label>Tutor Persona</label>
          <select value={tutorPersona} onChange={(e) => setTutorPersona(e.target.value)}>
            <option value="Socratic Sage">🧘 Socratic Sage</option>
            <option value="Strict Professor">🎓 Strict Professor</option>
            <option value="Supportive Peer">🤝 Supportive Peer</option>
            <option value="Direct Learner">⚡ Direct Learner</option>
          </select>
          <button className="dashboard-toggle" onClick={() => setShowDashboard(!showDashboard)}>
            {showDashboard ? "Back to Chat" : "📊 Study Insights"}
          </button>
        </div>

        <div className="history-section">
          <div className="history-header">
            <h3>Chat History</h3>
            <div className="history-actions">
              <select className="sort-select" value={sortMethod} onChange={handleSortChange}>
                <option value="newest">Newest</option>
                <option value="longest">Longest</option>
                <option value="shortest">Shortest</option>
              </select>
              <button className="clear-all-btn" onClick={clearAllSessions} title="Clear All History">
                🗑️
              </button>
            </div>
          </div>
          {sessions.length === 0 ? (
            <div className="empty-history">
              <p>No previous chats yet.</p>
              <span>Start a new conversation above.</span>
            </div>
          ) : (
            sessions.map((session, index) => (
              <button
                key={session.session_id}
                className={`history-item ${session.session_id === currentSessionId ? 'active' : ''}`}
                onClick={() => loadSession(session.session_id)}
                title={`${session.msg_count} messages`}
              >
                <span className="history-icon">💬</span>
                <span className="history-text">Chat {sessions.length - index}</span>
                <span className="history-count">{session.msg_count}</span>
                <button className="delete-item-btn" onClick={(e) => deleteSession(e, session.session_id)} title="Delete Chat">
                  ×
                </button>
              </button>
            ))
          )}
        </div>

          {/* Pomodoro Timer */}
          <div className="pomodoro-timer">
            <div className="timer-display">
              {Math.floor(pomodoroTime / 60)}:{String(pomodoroTime % 60).padStart(2, '0')}
            </div>
            <div className="timer-controls">
              <button onClick={togglePomodoro}>{isPomodoroActive ? "Pause" : "Start Focus"}</button>
              <button onClick={resetPomodoro}>Reset</button>
            </div>
          </div>

          <div className="pdf-section">
          <h3>Study Materials</h3>
          <div className="upload-actions">
            <button className="upload-btn" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload Media/Doc"}
              <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" onChange={handleFileUpload} />
            </button>
            <button className="camera-btn" onClick={openCamera} title="Take a Photo">
              📷
            </button>
          </div>

          {uploadedFile && (
            <>
              <div className="uploaded-file-info">📄 {uploadedFile}</div>
              <button
                className="action-btn"
                onClick={() => sendMessage("Provide a comprehensive summary of this document.")}
              >
                📝 Summarize
              </button>
              <button
                className="action-btn"
                onClick={() =>
                  sendMessage(
                    "Generate a 5-question multiple-choice quiz based on this document. Include the correct answers at the end."
                  )
                }
              >
                🎯 Generate Quiz
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-container">
        {showDashboard ? (
          <div className="dashboard-view">
            <h2>📈 Study Dashboard</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Chats</h3>
                <div className="stat-value">{sessions.length}</div>
              </div>
              <div className="stat-card">
                <h3>Documents</h3>
                <div className="stat-value">Active</div>
              </div>
              <div className="stat-card">
                <h3>Current Mode</h3>
                <div className="stat-value">{tutorPersona}</div>
              </div>
            </div>
            <div className="recent-activity">
              <h3>Recent Sessions</h3>
              {sessions.slice(0, 3).map(s => (
                <div key={s.session_id} className="activity-item">
                  <span>Chat Session</span>
                  <strong>{s.msg_count} messages</strong>
                </div>
              ))}
            </div>
            <button className="export-full-btn" onClick={exportChat}>📥 Export Current Chat as Markdown</button>
          </div>
        ) : (
          <div className="chat-box" onScroll={handleScroll}>
            {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">✨</div>
              <h2>Ready to study?</h2>
              <p>Upload a document, take a photo, or just start typing to begin your learning journey.</p>
              <div className="suggestions">
                <button onClick={() => setInput("Can you help me organize my study schedule?")}>📅 Schedule Help</button>
                <button onClick={() => setInput("Explain complex topics simply.")}>💡 Simplify Topics</button>
                <button onClick={() => setInput("Quiz me on my materials.")}>🎯 Quick Quiz</button>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="avatar">
                {msg.role === "user" ? "👤" : "✨"}
              </div>
              <div className="msg-content">
                <div className="bubble">
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>
                <div className="message-actions">
                  <div className="timestamp">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {msg.role === "assistant" && msg.content && (
                    <div className="pro-actions">
                      <button 
                        onClick={() => speakText(msg.content, i)} 
                        title={currentlyReading === i ? "Stop Reading" : "Read Aloud"}
                        className={currentlyReading === i ? "active-reading" : ""}
                      >
                        {currentlyReading === i ? "🔇" : "🔊"}
                      </button>
                      <button onClick={() => getFlashcards(msg.content)} title="Create Flashcards">🎴</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input */}
      <div 
        className={`input-area-wrapper ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="input-box">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={uploadedFile ? `Ask about ${uploadedFile}...` : "Send a message..."}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button 
              className={`mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
              title="Voice Typing"
            >
              🎤
            </button>
            <button onClick={() => sendMessage()} disabled={!input.trim()}>
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="camera-modal">
          <video ref={videoRef} autoPlay playsInline />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div className="camera-controls">
            <button className="capture-btn" onClick={takePhoto}>📸 Capture</button>
            <button className="cancel-btn" onClick={closeCamera}>❌ Cancel</button>
          </div>
        </div>
      )}

      {/* Flashcard Modal */}
      {showFlashcards && flashcards.length > 0 && (
        <div className="flashcard-modal">
          <div className="flashcard-container">
            <button className="close-flashcards" onClick={() => setShowFlashcards(false)}>×</button>
            <div className="flashcard-header">
              Study Card {activeCardIndex + 1} of {flashcards.length}
            </div>
            <div 
              className={`flashcard ${isFlipped ? 'flipped' : ''}`} 
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="flashcard-front">
                {flashcards[activeCardIndex].front}
                <div className="hint">Click to flip</div>
              </div>
              <div className="flashcard-back">
                {flashcards[activeCardIndex].back}
              </div>
            </div>
            <div className="flashcard-controls">
              <button onClick={exportFlashcards}>💾 Export to CSV (Anki)</button>
              <button 
                disabled={activeCardIndex === 0}
                onClick={() => { setActiveCardIndex(prev => prev - 1); setIsFlipped(false); }}
              >
                Previous
              </button>
              <button 
                disabled={activeCardIndex === flashcards.length - 1}
                onClick={() => { setActiveCardIndex(prev => prev + 1); setIsFlipped(false); }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;