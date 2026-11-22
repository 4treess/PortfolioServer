function Login({ onLoginSuccess }) {
    const [user, setUser] = React.useState(""); 
    const [feedback, setFeedback] = React.useState("");

    async function getWebData(e) {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:8000/Login/${user}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data[0]?.Count > 0) {
                    onLoginSuccess(user); 
                } else {
                    setFeedback("Invalid Username! If you havent logged in before, please sign up!");
                }
            }
        } catch (error) {
            setFeedback("The server is currently experiencing non-trivial problems.");
        }
    }

    return (
        <form onSubmit={getWebData} className="auth-form">
            <input 
                type="text" 
                placeholder="Enter username"
                value={user} 
                onChange={(e) => setUser(e.target.value)} 
                className="math-input"
            />
            <button type="submit" id="generateBtn" style={{ width: '100%' }}>Login</button>
            {feedback && <p className="status-msg" style={{ color: '#ef4444' }}>{feedback}</p>}
        </form>
    );
}