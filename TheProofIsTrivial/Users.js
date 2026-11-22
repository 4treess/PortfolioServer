function AddUser() {
    const [user, setUser] = React.useState("");
    const [feedback, setFeedback] = React.useState("");

    async function sendUserDataToPython(e) {
        e.preventDefault();
        if (!user.trim()) return;
        try {
            const response = await fetch('http://localhost:8000/AddUser', {
                method: "POST", 
                headers: {'Content-Type': "application/json"}, 
                body: JSON.stringify({"username": user})
            });
            const success = await response.json();
            setFeedback(success ? "User created! You can now login." : "Username already exists.");
        } catch (error) {
            setFeedback("Server Connection Error");
        }
    }

    return (
        <form onSubmit={sendUserDataToPython} className="auth-form">
            <input 
                type="text" 
                placeholder="Choose a username"
                value={user} 
                onChange={(e) => setUser(e.target.value)}
                className="math-input"
            />
            <button type="submit" className="secondary-btn">Create Account</button>
            {feedback && <p className="status-msg">{feedback}</p>}
        </form>
    );
}

async function DelUser(username) {
    const user = username

        try {
            const response = await fetch('http://localhost:8000/DelUser', {
                method: "POST", 
                headers: {'Content-Type': "application/json"}, 
                body: JSON.stringify({"username": user})
            });
            const success = await response.json();
            console.log(success ? "User Deleted!" : "Error Deleting User!");
        } catch (error) {
            console.log(error)
        }
}