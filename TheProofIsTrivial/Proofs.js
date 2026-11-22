function Latex({ math }) {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (containerRef.current && window.renderMathInElement) {
      window.renderMathInElement(containerRef.current, {
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

function GetProof({ username, setUsername, view, setView }) {
    const [proofs, setProofs] = React.useState([]);
    const [proposition, setProposition] = React.useState("");
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

    async function getWebData(e) {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:8000/Proof/${proposition}`);
            let data = await response.json();
            if(Array.isArray(data) && data.length === 0){
                const successful = await AddProof(proposition, username)
                if (successful){
                    const response = await fetch(`http://localhost:8000/Proof/${proposition}`);
                    data = await response.json();
                }
            }

            setProofs(data);

        } catch (error) {
            console.error("Fetch error", error);
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
        <div className="logo">S imply Z || The Proof is Trivial</div>
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
            placeholder="e.g., a|b&&b|c=>a|c"
          />

          <div className="btn-container">
            <button id="generateBtn" onClick={getWebData}>
              Trivialize the Proof
            </button>
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

function GetProofs({ username, setUsername, view, setView }) {
    const [proofs, setProofs] = React.useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

    React.useEffect(() => {
        if (username && username !== '\0') {
            fetchAll();
        }
    }, [username]);

    async function fetchAll() {
        try {
            const response = await fetch(`http://localhost:8000/Proofs/${username}`);
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
                <div className="logo">S imply Z || The Proof is Trivial</div>
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
    let tempData = 0;

    try {
        const response = await fetch('http://localhost:8000/Proof', {method: "POST", headers: {'Content-Type': "application/json"}, body: JSON.stringify({"proposition": proposition, "result": "", "creator": username})});
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

async function DelProof(proof, username) {
    let tempData = 0;

    try {
        const response = await fetch('http://localhost:8000/DelProof', {method: "POST", headers: {'Content-Type': "application/json"}, body: JSON.stringify({"proposition": proof, "result": "", "creator": username})});
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