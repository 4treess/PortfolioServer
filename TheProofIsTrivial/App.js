function App() {
    const [view, setView] = React.useState('generate');
    const [username, setUsername] = React.useState("\0");

    if (username !== "\0") {
        if(view === 'generate')
            return (
                <div>
                    <GetProof username={username} setUsername={(name) => setUsername(name)} view={view} setView={(vision) => setView(vision)}/> 
                </div>
            );
        else if(view === 'manage')
           return (
                <div>
                    <GetProofs username={username} setUsername={(name) => setUsername(name)} view={view} setView={(vision) => setView(vision)}/> 
                </div>
            ); 
    }

    return (
        <div className="app-wrapper">
            <nav>
                <div className="logo">S imply Z || The Proof is Trivial</div>
            </nav>

            <div className="container">
                <aside className="side-panel">
                    <img className="math-img" src="https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=400" alt="Blackboard" />
                    <div className="joke-card">
                        "I had a argument with a 90 degree angle. It turns out it was right."
                    </div>
                </aside>

                <main className="generator-box">
                    <h1>Welcome to The Proof Is Trivial!</h1>
                    <p style={{ color: "var(--text-dim)" }}>Please Login to begin generating trivialities.</p>
                    
                    <div className="auth-section">
                        <Login onLoginSuccess={(name) => setUsername(name)} />
                        
                        <div style={{ margin: '40px 0', borderTop: '1px solid #334155', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--card-bg)', padding: '0 15px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                                OR
                            </span>
                        </div>

                        <h3>New Here?</h3>
                        <AddUser />
                    </div>
                </main>

                <aside className="side-panel">
                    <div className="joke-card">
                        "What's a mathematician's favorite dessert? Pi."
                    </div>
                    <img className="math-img" src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400" alt="Abstract Math" />
                </aside>
            </div>
        </div>
    );
}