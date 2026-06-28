export default function Login() {
  return (
    <div>
      <h1>Login</h1>
      <form method="POST" action="/login">
        <input name="username" />
        <input name="password" type="password" />
        <button>Login</button>
      </form>
    </div>
  );
}
