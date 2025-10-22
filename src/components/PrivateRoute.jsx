import { Navigate } from "react-router-dom";

export default function PrivateRoute({ element }) {
  const token = localStorage.getItem("accessToken");
  const expire = localStorage.getItem("accessTokenExpiresAt");

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (expire && Date.now() > Number(expire)) {
    localStorage.clear();
    alert("로그인 시간이 만료되었습니다.");
    return <Navigate to="/login" replace />;
  }

  return element;
}