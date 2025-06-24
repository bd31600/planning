import { type FC } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import logoIcam from "../assets/logotype-seul-couleur-CMJN.jpg";
import "./Topbar.css";

type Role = "admin" | "intervenant" | "eleve";

interface TopbarProps {
  role?: Role;
}

const Topbar: FC<TopbarProps> = ({ role }) => {
  const { user, logout } = useAuth();
  const name = user?.displayName
    ? user.displayName
    : user?.email?.split("@")[0] || "Utilisateur";
  const avatarUrl = user?.photoURL ?? "";

  return (
    <header className="topbar">
      <div className="topbar__left">
        <img src={logoIcam} alt="Logo ICAM" className="topbar__logo" />
        <div className="topbar__profile">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="topbar__avatar" />
          ) : (
            <div className="topbar__avatar-placeholder">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="topbar__user">{name}</span>
        </div>
      </div>

      <div className="topbar__center">
        <Link to="/" className="topbar__title">
          Planning ICAM
        </Link>
      </div>

      <div className="topbar__actions">
        {role === "admin" && (
          <NavLink
            to="/eleves"
            className={({ isActive }) =>
              isActive ? "topbar__link topbar__link--active" : "topbar__link"
            }
          >
            Élèves
          </NavLink>
        )}
        {role === "admin" && (
          <NavLink
            to="/intervenants"
            className={({ isActive }) =>
              isActive ? "topbar__link topbar__link--active" : "topbar__link"
            }
          >
            Intervenants
          </NavLink>
        )}
        {role === "admin" && (
          <NavLink
            to="/parametres"
            className={({ isActive }) =>
              isActive ? "topbar__link topbar__link--active" : "topbar__link"
            }
          >
            Paramètres
          </NavLink>
        )}
        <button onClick={logout} className="topbar__logout">
          Se déconnecter
        </button>
      </div>
    </header>
  );
};

export default Topbar;