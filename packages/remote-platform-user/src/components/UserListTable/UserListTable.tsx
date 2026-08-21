import React from 'react';
import { FaTrash } from 'react-icons/fa';
import type { User } from '../../types';
import './UserListTable.css';

interface UserListTableProps {
  users: User[];
  title: string;
  onDelete?: (userId: string) => void;
}


const UserListTable: React.FC<UserListTableProps> = ({ users, title, onDelete }) => {
  return (
    <div className="nad-table-container">
      <h3 className="nad-table-title">{title}</h3>

      {users.length === 0 ? (
        <p className="nad-empty">No users found</p>
      ) : (
        <div className="nad-table-wrapper">
          <table className="nad-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="nad-name-cell" title={user.name}>{user.name}</td>
                  <td className="nad-email-cell" title={user.email}>{user.email}</td>
                  <td className="nad-username-cell" title={user.userName || '-'}>
                    {user.userName || '-'}
                  </td>
                  <td>
                    <span className="nad-badge">
                      {user.userRole.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`nad-status nad-status-${user.status}`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className="nad-actions">
                      {onDelete && (
                        <button
                          className="nad-btn-action nad-btn-delete"
                          onClick={() => onDelete(user.id)}
                          title="Delete user"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserListTable;