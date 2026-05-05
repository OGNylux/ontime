import { useEffect, useState } from "react";
import {
  Box, Typography, Divider, Alert, Button, TextField,
  Select, MenuItem, FormControl, InputLabel, IconButton,
  List, ListItem, ListItemText, Chip, CircularProgress, Tooltip,
} from "@mui/material";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import SendIcon from "@mui/icons-material/Send";
import CancelIcon from "@mui/icons-material/Cancel";
import { workspaceService, WorkspaceMember, WorkspaceRole } from "../../services/workspaceService";
import { inviteService, WorkspaceInvite, InviteRole } from "../../services/inviteService";
import { requireUserId } from "../../services/workspaceContext";
import dayjs from "dayjs";

interface Props {
  workspaceId: string;
}

export default function WorkspaceMembersCard({ workspaceId }: Props) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [uid, memberList, inviteList] = await Promise.all([
          requireUserId(),
          workspaceService.listMembers(workspaceId),
          inviteService.listForWorkspace(workspaceId),
        ]);
        setCurrentUserId(uid);
        setMembers(memberList);
        setInvites(inviteList);
      } catch (e: any) {
        setError(e.message || "Failed to load members");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId]);

  const myRole = members.find((m) => m.user_id === currentUserId)?.role as WorkspaceRole | undefined;
  const canManage = myRole === "owner" || myRole === "admin";

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    setSuccess(null);
    try {
      await inviteService.create({ workspaceId, email: inviteEmail.trim(), role: inviteRole });
      const updated = await inviteService.listForWorkspace(workspaceId);
      setInvites(updated);
      setInviteEmail("");
      setSuccess(`Invite sent to ${inviteEmail.trim()}`);
    } catch (e: any) {
      setError(e.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setError(null);
    try {
      await inviteService.revoke(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setError(e.message || "Failed to revoke invite");
    }
  };

  const handleRoleChange = async (userId: string, role: WorkspaceRole) => {
    setError(null);
    try {
      await workspaceService.updateMemberRole(workspaceId, userId, role);
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role } : m)));
    } catch (e: any) {
      setError(e.message || "Failed to update role");
    }
  };

  const handleRemove = async (userId: string) => {
    setError(null);
    try {
      await workspaceService.removeMember(workspaceId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e: any) {
      setError(e.message || "Failed to remove member");
    }
  };

  const pendingInvites = invites.filter(
    (i) => !i.accepted_at && new Date(i.expires_at) > new Date()
  );
  const expiredCount = invites.filter(
    (i) => !i.accepted_at && new Date(i.expires_at) <= new Date()
  ).length;

  return (
    <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mb={3}>
      <Typography variant="h6" gutterBottom>
        Workspace Members
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={2}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          {/* ── Member list ── */}
          <List disablePadding>
            {members.map((member) => {
              const isMe = member.user_id === currentUserId;
              const isOwner = member.role === "owner";
              // Only owners can change roles; can't change owner or self
              const canChangeRole = myRole === "owner" && !isOwner && !isMe;
              // Owners and admins can remove non-owner members (not themselves)
              const canRemove = canManage && !isOwner && !isMe;

              return (
                <ListItem
                  key={member.user_id}
                  disableGutters
                  sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1 }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={500}>
                          {member.user?.name ?? "Unknown"}
                        </Typography>
                        {isMe && (
                          <Chip
                            label="you"
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: 10, px: 0.25 }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <Box display="flex" alignItems="center" gap={1}>
                    {canChangeRole ? (
                      <FormControl size="small" sx={{ minWidth: 110 }}>
                        <Select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.user_id, e.target.value as WorkspaceRole)
                          }
                        >
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="member">Member</MenuItem>
                        </Select>
                      </FormControl>
                    ) : (
                      <Chip
                        label={member.role}
                        size="small"
                        color={
                          isOwner ? "primary" : member.role === "admin" ? "secondary" : "default"
                        }
                      />
                    )}
                    {canRemove && (
                      <Tooltip title="Remove member">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemove(member.user_id)}
                        >
                          <PersonRemoveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </ListItem>
              );
            })}
          </List>

          {/* ── Invite form ── */}
          {canManage && (
            <Box mt={3}>
              <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                Invite member
              </Typography>
              <Box display="flex" gap={1} alignItems="flex-start">
                <TextField
                  label="Email"
                  type="email"
                  size="small"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    label="Role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as InviteRole)}
                  >
                    {myRole === "owner" && <MenuItem value="admin">Admin</MenuItem>}
                    <MenuItem value="member">Member</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  startIcon={<SendIcon />}
                  sx={{ height: 40, whiteSpace: "nowrap" }}
                >
                  {inviting ? "Sending…" : "Send"}
                </Button>
              </Box>
            </Box>
          )}

          {/* ── Pending invites ── */}
          {pendingInvites.length > 0 && (
            <Box mt={3}>
              <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                Pending invites
              </Typography>
              <List disablePadding>
                {pendingInvites.map((invite) => (
                  <ListItem
                    key={invite.id}
                    disableGutters
                    sx={{ borderBottom: "1px solid", borderColor: "divider", py: 0.75 }}
                  >
                    <ListItemText
                      primary={<Typography variant="body2">{invite.email}</Typography>}
                      secondary={`Expires ${dayjs(invite.expires_at).format("MMM D")}`}
                    />
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label={invite.role} size="small" />
                      {canManage && (
                        <Tooltip title="Revoke invite">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRevoke(invite.id)}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {expiredCount > 0 && (
            <Typography variant="caption" color="text.disabled" mt={1.5} display="block">
              {expiredCount} expired invite{expiredCount > 1 ? "s" : ""} (not shown)
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
