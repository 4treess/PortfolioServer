import React from 'react';
import renderMathInElement from 'katex/contrib/auto-render';
import { apiFetch } from './src/api.js';
import { DelUser } from './Users.jsx';

export function Latex({ math }) {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (containerRef.current) {
      renderMathInElement(containerRef.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    }
  }, [math]);

  return (
    <div 
      ref={containerRef} 
      style={{ whiteSpace: 'pre-wrap' }} 
    >
      {math}
    </div>
  );
}

export function GetProof({ username, setUsername, view, setView }) {
    const [proofs, setProofs] = React.useState([]);
    const [proposition, setProposition] = React.useState("");
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [generationStatus, setGenerationStatus] = React.useState("");
    const [retryCountdown, setRetryCountdown] = React.useState(null);

    async function addProofWithRetry(proofProposition, proofUsername) {
        let retryCount = 0;

        while (true) {
            try {
                return await AddProof(proofProposition, proofUsername);
            } catch (error) {
                if (!(error instanceof Error) || ![429, 503].includes(error.status)) {
                    throw error;
                }

                const delaySeconds = Math.min(2 ** retryCount, 30);
                retryCount += 1;
                const reason = error.status === 429
                    ? "rate-limited"
                    : "temporarily unavailable";
                setGenerationStatus(`Gemini is ${reason}. Retrying automatically.`);

                for (let remaining = delaySeconds; remaining > 0; remaining -= 1) {
                    setRetryCountdown(remaining);
                    await new Promise((resolve) => window.setTimeout(resolve, 1000));
                }

                setRetryCountdown(null);
                setGenerationStatus("Retrying proof generation...");
            }
        }
    }

    async function getWebData(e) {
        e.preventDefault();
        if (isGenerating) return;

        setIsGenerating(true);
        setGenerationStatus("Checking for an existing proof...");
        setRetryCountdown(null);

        try {
            const response = await apiFetch(`/Proof/${encodeURIComponent(proposition)}`);
            if (!response.ok) throw new Error(`Proof lookup failed (${response.status}).`);
            let data = await response.json();
            if (Array.isArray(data) && data.length === 0) {
                const successful = await addProofWithRetry(proposition, username);
                if (successful) {
                    const response = await apiFetch(`/Proof/${encodeURIComponent(proposition)}`);
                    if (!response.ok) throw new Error(`Proof lookup failed (${response.status}).`);
                    data = await response.json();
                    setGenerationStatus("Proof generated successfully.");
                } else {
                    setGenerationStatus("Proof generation did not complete.");
                }
            } else {
                setGenerationStatus("Loaded saved proof.");
            }

            setProofs(data);
        } catch (error) {
            console.error("Fetch error", error);
            setGenerationStatus(
                error instanceof Error ? error.message : "The proof request failed."
            );
        } finally {
            setIsGenerating(false);
            setRetryCountdown(null);
        }
    }

    const handleDelUser = (e) => {
    e.preventDefault();
    if (window.confirm("Are you sure you want to delete your account?")) {
       DelUser(username); 
       setUsername('\0');
       console.log("Account deleted.");
    }
  };

    return (
        <div className="app-wrapper">
      <nav>
        <div className="logo">Trevor De Clark || The Proof is Trivial</div>
        <ul className="nav-links">
          <li><a href="#" className={view === 'generate' ? 'active-page' : ''} 
            onClick={(e) => { e.preventDefault(); setView('generate'); }}>Generate Proof</a></li>
          <li><a href="#" className={view === 'manage' ? 'active-page' : ''} 
            onClick={(e) => { e.preventDefault(); setView('manage'); }}>Manage your Proofs</a></li>
          <li 
            className="dropdown" 
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <a href="#!" className="dropbtn">Account ▼</a>
            {isDropdownOpen && (
              <div className="dropdown-content">
                <a href="#" onClick={(e) => { e.preventDefault(); setUsername('\0'); }}>Sign Out</a>
                <a href="https://youtu.be/xvFZjo5PgG0?si=v3olJo6kLQGr37Fg" target="_blank" rel="noreferrer">
                  The Meaning Of Life
                </a>
                <a href="#" style={{ color: '#ef4444' }} onClick={handleDelUser}>
                  Delete Account
                </a>
              </div>
            )}
          </li>
        </ul>
      </nav>

      <div className="container">
        <aside className="side-panel">
          <img 
            className="math-img" 
            src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400" 
            alt="Math Abstract" 
          />
          <div className="joke-card">
            "Why was the equal sign so humble? Because he knew he wasn't less than or greater than anyone else."
          </div>
          <div className="joke-card">
            <strong>The Mathematician's Motto:</strong><br />
            If it's hard, it's a theorem. If it's easy, it's a corollary. If you can't figure it out, <em>the proof is trivial.</em>
          </div>
        </aside>

        <main className="generator-box">
          <h1>Theorem Input</h1>
          <p style={{ color: "var(--text-dim)" }}>
            Enter your mathematical statement below. Let us handle the hand-waving.
          </p>

          <textarea
            value={proposition}
            onChange={(e) => setProposition(e.target.value)}
            placeholder="e.g., Let T and G be graphs, where G is a connected subgraph of T. If T is a tree than G must also be a tree"
          />

          <div className="btn-container">
            <button id="generateBtn" onClick={getWebData} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Trivialize the Proof"}
            </button>
            {generationStatus && (
              <p className="status-msg" role="status" aria-live="polite">
                {generationStatus}
                {retryCountdown !== null &&
                  ` Retrying in ${retryCountdown} second${retryCountdown === 1 ? "" : "s"}.`}
              </p>
            )}
          </div>

          <div className="output-container">
            <h3>Resulting Proof:</h3>
            <div id="proofOutput">
            {proofs.length > 0 ? (
                proofs.map((item, i) => (
                <div key={i} className="proof-item">
                    <strong>Claim:</strong>{item.proposition}<br />
                    <div style={{ marginTop: '10px' }}>
                        <strong>Proof:</strong> 
                        <Latex math={item.result} block={true} />
                    </div>
                </div>
                ))
            ) : (
                <span className="placeholder-text">Your elegant, rigorous proof will appear here...</span>
            )}
            </div>
          </div>
        </main>

        <aside className="side-panel">
          <div className="joke-card">
            "Parallel lines have so much in common. It's a shame they'll never meet."
          </div>
          <img 
            className="math-img" 
            src="https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=400" 
            alt="Blackboard" 
          />
          <div className="joke-card">
            "An engineer thinks that his equations are an approximation to reality. A physicist thinks reality is an approximation to his equations. A mathematician doesn't care."
          </div>
        </aside>
      </div>
    </div>
    );
}

export function GetProofs({ username, setUsername, view, setView }) {
    const [proofs, setProofs] = React.useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

    React.useEffect(() => {
        if (username && username !== '\0') {
            fetchAll();
        }
    }, [username]);

    async function fetchAll() {
        try {
            const response = await apiFetch(`/Proofs/${encodeURIComponent(username)}`);
            if (!response.ok) throw new Error(`Proof list failed (${response.status}).`);
            const data = await response.json();
            setProofs(Array.isArray(data) ? data : []);
        } catch (error) { 
            console.error("Fetch error:", error); 
        }
    }

    const handleDelete = async (proposition, creator) => {
        if (window.confirm("Are you sure this proof is no longer trivial?")) {
            await DelProof(proposition, creator);
            fetchAll();
        }
    };

    const handleDelUser = (e) => {
    e.preventDefault();
        if (window.confirm("Are you sure you want to delete your account?")) {
        DelUser(username); 
        setUsername('\0');
        console.log("Account deleted.");
        }
    };

    return (
        <div className="app-wrapper">
            <nav>
                <div className="logo">Trevor De Clark || The Proof is Trivial</div>
                <ul className="nav-links">
                    <li><a href="#" className={view === 'generate' ? 'active-page' : ''} 
                        onClick={(e) => { e.preventDefault(); setView('generate'); }}>Generate Proof</a></li>
                    <li><a href="#" className={view === 'manage' ? 'active-page' : ''} 
                        onClick={(e) => { e.preventDefault(); setView('manage'); }}>Manage your Proofs</a></li>
                    <li 
                        className="dropdown" 
                        onMouseEnter={() => setIsDropdownOpen(true)}
                        onMouseLeave={() => setIsDropdownOpen(false)}
                    >
                        <a href="#!" className="dropbtn">Account ▼</a>
                        {isDropdownOpen && (
                            <div className="dropdown-content">
                                <a href="#" onClick={(e) => { e.preventDefault(); setUsername('\0'); }}>Sign Out</a>
                                <a href="https://youtu.be/xvFZjo5PgG0?si=v3olJo6kLQGr37Fg" target="_blank" rel="noreferrer">
                                    The Meaning Of Life
                                </a>
                                <a href="#" style={{ color: '#ef4444' }} onClick={handleDelUser}>Delete Account</a>
                            </div>
                        )}
                    </li>
                </ul>
            </nav>

            <div className="container">
                <aside className="side-panel">
                    <img className="math-img" src="https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=400" alt="Blackboard" />
                    <div className="joke-card">
                        <strong>Your Stats:</strong><br />
                        User: {username}<br />
                        Total Proofs: {proofs.length}
                    </div>
                </aside>

                <main className="generator-box">
                    <h1>A List of Your Trivial Proofs</h1>
                    <p style={{ color: "var(--text-dim)" }}>Archive of all "obvious" mathematical truths.</p>
                    
                    <div className="output-container">
                        {proofs.length > 0 ? (
                            proofs.map((item, i) => (
                                <div key={i} className="proof-item-card">
                                    <div className="proof-header">
                                        <strong><br/>{item.creator}'s Proof #{i + 1} &nbsp; </strong>
                                        <button 
                                            className="delete-link" 
                                            onClick={(e) => handleDelete(item.proposition, item.creator)}
                                        >
                                            Discard Proof
                                        </button>
                                    </div>
                                    <div className="proof-body">
                                        <div><strong>Claim:</strong>{item.proposition}</div>
                                        <div><strong>Proof:</strong> <Latex math={item.result} /></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="placeholder-text">No proofs found. Perhaps nothing is trivial yet?</p>
                        )}
                    </div>
                </main>

                <aside className="side-panel">
                    <div className="joke-card">
                        "What do you call a crushed angle? A rectangle."
                    </div>
                    <div className="joke-card">
                        "Why do plant biologists hate math? Because they don't want to deal with square roots."
                    </div>
                </aside>
            </div>
        </div>
    );
}

async function AddProof(proposition, username) {
    const response = await apiFetch('/Proof', {
        method: "POST",
        headers: {'Content-Type': "application/json"},
        body: JSON.stringify({"proposition": proposition, "result": "", "creator": username})
    });

    if (!response.ok) {
        let detail;
        if (response.headers.get("content-type")?.includes("application/json")) {
            const data = await response.json();
            detail = data.detail;
        }
        const message = typeof detail === "string"
            ? detail
            : `Proof generation failed (${response.status}).`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return response.json();
}

async function DelProof(proof, username) {
    let tempData = 0;

    try {
        const response = await apiFetch('/DelProof', {method: "POST", headers: {'Content-Type': "application/json"}, body: JSON.stringify({"proposition": proof, "result": "", "creator": username})});
        if(response.ok){
            tempData = await response.json();
            console.log("Retrieved The following from the server: ", tempData);
        } else {
            console.error("Error Connecting to server: ", response.status);
        }
    } catch (error) {
        console.error("Could not connect to the server! ", error);
    }
    return tempData
}