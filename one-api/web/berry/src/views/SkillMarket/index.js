import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Skeleton,
  InputAdornment,
  Fade,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Collapse
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { API } from 'utils/api';
import { showError, showSuccess, copy } from 'utils/common';
import {
  IconSearch,
  IconDownload,
  IconTrash,
  IconUpload,
  IconTerminal,
  IconX,
  IconCopy,
  IconFileText,
  IconBook,
  IconFolder,
  IconPlus,
  IconChevronRight,
  IconArrowLeft,
  IconEdit,
  IconPencil,
  IconFileZip,
  IconFolderUp,
  IconArrowUp,
  IconHistory,
  IconDragDrop,
  IconFileCheck,
  IconFileX
} from '@tabler/icons-react';
import JSZip from 'jszip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SKILL_CATEGORIES = ['编码', '调试', '测试', '部署', '文档', '工具', '其他'];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const MarkdownRenderer = ({ content, theme }) => {
  if (!content) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        暂无内容
      </Typography>
    );
  }
  return (
    <Box
      sx={{
        '& h1': { fontSize: '1.5rem', fontWeight: 700, mt: 2, mb: 1, color: theme.palette.text.primary },
        '& h2': { fontSize: '1.25rem', fontWeight: 600, mt: 2, mb: 1, color: theme.palette.text.primary },
        '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 1.5, mb: 0.5, color: theme.palette.text.primary },
        '& p': { fontSize: '0.875rem', lineHeight: 1.7, mb: 1, color: theme.palette.text.primary },
        '& ul, & ol': { pl: 2.5, mb: 1 },
        '& li': { fontSize: '0.875rem', lineHeight: 1.7, color: theme.palette.text.primary },
        '& code': {
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          px: 0.5,
          py: 0.2,
          borderRadius: 0.5,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          color: theme.palette.mode === 'dark' ? '#e06c75' : '#c7254e',
        },
        '& pre': {
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          p: 1.5,
          borderRadius: 1,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'auto',
          mb: 1,
        },
        '& pre code': {
          bgcolor: 'transparent',
          px: 0,
          py: 0,
          color: theme.palette.text.primary,
        },
        '& blockquote': {
          borderLeft: `3px solid ${theme.palette.primary.main}`,
          pl: 1.5,
          ml: 0,
          mr: 0,
          mb: 1,
          color: theme.palette.text.secondary,
          fontSize: '0.875rem',
        },
        '& a': {
          color: theme.palette.primary.main,
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
        },
        '& table': {
          borderCollapse: 'collapse',
          width: '100%',
          mb: 1,
          fontSize: '0.8rem',
        },
        '& th, & td': {
          border: `1px solid ${theme.palette.divider}`,
          px: 1,
          py: 0.5,
          textAlign: 'left',
        },
        '& th': {
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          fontWeight: 600,
        },
        '& hr': { border: 'none', borderTop: `1px solid ${theme.palette.divider}`, my: 2 },
        '& img': { maxWidth: '100%', borderRadius: 1 },
        '& del, & s': { color: theme.palette.text.secondary },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} linkTarget="_blank">
        {content}
      </ReactMarkdown>
    </Box>
  );
};

const ProjectCard = ({ project, user, theme, onClick, onDelete, onEdit }) => {
  const isOwner = user && project.user_id === user.id;
  const isAdmin = user && user.role >= 10;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.12)' : 'rgba(33,150,243,0.12)'}`,
          transform: 'translateY(-1px)'
        },
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.background.default
      }}
      onClick={() => onClick(project)}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <IconFolder size={20} color={theme.palette.primary.main} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.name}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {project.description || '暂无描述'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                {project.user_name || '未知'}
              </Typography>
              <Chip label={`${project.skill_count || 0} 个 Skill`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.5 } }} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            {(isOwner || isAdmin) && (
              <>
                <Tooltip title="编辑" arrow>
                  <IconButton size="small" onClick={() => onEdit(project)} sx={{ color: theme.palette.text.secondary }}>
                    <IconPencil size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="删除" arrow>
                  <IconButton size="small" onClick={() => onDelete(project)} sx={{ color: theme.palette.error.main }}>
                    <IconTrash size={16} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const SkillCard = ({ skill, user, theme, onDownload, onInstall, onDelete, onDetail, onUpgrade }) => {
  const isOwner = user && skill.user_id === user.id;
  const isAdmin = user && user.role >= 10;
  const isComplex = skill.skill_type === 'complex';
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const loadVersions = async () => {
    if (versions.length > 0) { setShowVersions(!showVersions); return; }
    setVersionsLoading(true);
    try {
      const res = await API.get(`/api/skill/${skill.id}/versions`);
      const { success, data } = res.data;
      if (success) setVersions(data || []);
    } catch (err) { /* ignore */ }
    setVersionsLoading(false);
    setShowVersions(true);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.12)' : 'rgba(33,150,243,0.12)'}`
        },
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.background.default
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onDetail(skill)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              {isComplex ? (
                <IconFileZip size={18} color={theme.palette.warning.main} />
              ) : (
                <IconFileText size={18} color={theme.palette.primary.main} />
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {skill.name}
              </Typography>
              <Chip
                label={isComplex ? 'ZIP' : skill.file_type?.toUpperCase()}
                size="small"
                variant="outlined"
                color={isComplex ? 'warning' : 'default'}
                sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.5 } }}
              />
              {skill.category && (
                <Chip label={skill.category} size="small" color="primary" variant="filled" sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.5 } }} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {skill.description || '暂无描述'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                {skill.user_name || '未知'}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                <IconDownload size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                {skill.downloads}
              </Typography>
              {skill.version && (
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                  v{skill.version}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {(isOwner || isAdmin) && (
              <Tooltip title="升级版本" arrow>
                <IconButton size="small" onClick={() => onUpgrade(skill)} sx={{ color: theme.palette.success.main }}>
                  <IconArrowUp size={18} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="一键安装" arrow>
              <IconButton size="small" onClick={() => onInstall(skill)} sx={{ color: theme.palette.primary.main }}>
                <IconTerminal size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={isComplex ? '下载 ZIP' : '下载'} arrow>
              <IconButton size="small" onClick={() => onDownload(skill)} sx={{ color: theme.palette.text.secondary }}>
                <IconDownload size={18} />
              </IconButton>
            </Tooltip>
            {(isOwner || isAdmin) && (
              <Tooltip title="删除" arrow>
                <IconButton size="small" onClick={() => onDelete(skill)} sx={{ color: theme.palette.error.main }}>
                  <IconTrash size={18} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        {/* Version history toggle */}
        <Box sx={{ mt: 1, borderTop: `1px solid ${theme.palette.divider}`, pt: 0.5 }}>
          <Button
            size="small"
            onClick={loadVersions}
            startIcon={<IconHistory size={14} />}
            sx={{ fontSize: '0.7rem', textTransform: 'none', p: 0, minWidth: 0, color: theme.palette.text.secondary }}
          >
            版本历史 {versions.length > 0 ? `(${versions.length})` : ''}
          </Button>
        </Box>
        <Collapse in={showVersions}>
          {versionsLoading && <Skeleton height={40} sx={{ mt: 1 }} />}
          {!versionsLoading && versions.length > 1 && (
            <Box sx={{ mt: 0.5 }}>
              {versions.map((v) => (
                <Box
                  key={v.id}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 1,
                    borderRadius: 1,
                    bgcolor: v.is_archived
                      ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')
                      : (theme.palette.mode === 'dark' ? 'rgba(33,150,243,0.08)' : 'rgba(33,150,243,0.05)'),
                    mb: 0.5,
                    opacity: v.is_archived ? 0.7 : 1
                  }}
                >
                  <Typography variant="caption" sx={{ flex: 1, fontSize: '0.7rem' }}>
                    v{v.version || '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.65rem' }}>
                    {v.user_name} · {new Date(v.created_time * 1000).toLocaleDateString()}
                  </Typography>
                  {v.is_archived && (
                    <Chip label="归档" size="small" sx={{ fontSize: '0.55rem', height: 16, '& .MuiChip-label': { px: 0.5 } }} />
                  )}
                  {!v.is_archived && (
                    <Chip label="当前" size="small" color="primary" sx={{ fontSize: '0.55rem', height: 16, '& .MuiChip-label': { px: 0.5 } }} />
                  )}
                  <Tooltip title="下载此版本" arrow>
                    <IconButton size="small" onClick={() => onDownload(v)} sx={{ color: theme.palette.text.secondary }}>
                      <IconDownload size={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
          {!versionsLoading && versions.length <= 1 && showVersions && (
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mt: 0.5 }}>
              暂无历史版本
            </Typography>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

const CreateProjectDialog = ({ open, onClose, onCreated, theme }) => {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name) {
      showError('请填写项目名称');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/api/skill-project/', form);
      const { success, message } = res.data;
      if (success) {
        showSuccess('项目创建成功');
        setForm({ name: '', description: '' });
        onCreated();
        onClose();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        创建项目
        <IconButton size="small" onClick={onClose}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="项目名称" size="small" fullWidth value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField label="描述" size="small" fullWidth multiline minRows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? '创建中...' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EditProjectDialog = ({ open, project, onClose, onUpdated, theme }) => {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({ name: project.name || '', description: project.description || '' });
    }
  }, [project]);

  const handleSubmit = async () => {
    if (!form.name) {
      showError('请填写项目名称');
      return;
    }
    setLoading(true);
    try {
      const res = await API.put(`/api/skill-project/${project.id}`, form);
      const { success, message } = res.data;
      if (success) {
        showSuccess('项目更新成功');
        onUpdated();
        onClose();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err);
    }
    setLoading(false);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        编辑项目
        <IconButton size="small" onClick={onClose}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="项目名称" size="small" fullWidth value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField label="描述" size="small" fullWidth multiline minRows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const UploadDialog = ({ open, onClose, onCreated, theme, projectId, upgradeSkill }) => {
  const isUpgrade = !!upgradeSkill;
  const [form, setForm] = useState({ name: '', description: '', category: '工具', version: '1.0' });
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'folder'
  const [selectedFiles, setSelectedFiles] = useState([]); // array of { file, name, skillMdPreview, hasSkillMd }
  const [hasSkillMd, setHasSkillMd] = useState(null);
  const [skillMdPreview, setSkillMdPreview] = useState('');
  const [packagingProgress, setPackagingProgress] = useState(0);
  const [isPackaging, setIsPackaging] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState([]); // { name, status: 'pending'|'uploading'|'success'|'error', message? }
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const resetState = useCallback(() => {
    setForm({ name: '', description: '', category: '工具', version: '1.0' });
    setSelectedFiles([]);
    setHasSkillMd(null);
    setSkillMdPreview('');
    setPackagingProgress(0);
    setIsPackaging(false);
    setDragActive(false);
    setBatchProgress({ current: 0, total: 0 });
    setBatchResults([]);
    setIsBatchUploading(false);
  }, []);

  // Initialize form when upgrading
  useEffect(() => {
    if (upgradeSkill) {
      let nextVersion = '1.0';
      if (upgradeSkill.version) {
        const parts = upgradeSkill.version.split('.');
        if (parts.length >= 2) {
          const last = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(last)) {
            parts[parts.length - 1] = String(last + 1);
            nextVersion = parts.join('.');
          }
        }
      }
      setForm({
        name: upgradeSkill.name || '',
        description: upgradeSkill.description || '',
        category: upgradeSkill.category || '工具',
        version: nextVersion
      });
    } else {
      resetState();
    }
  }, [upgradeSkill]);

  const handleClose = () => {
    if (!isBatchUploading) {
      resetState();
      onClose();
    }
  };

  // Validate and process a single file into a selectedFile entry
  const processFile = async (file) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.md' && ext !== '.zip') {
      return null; // skip unsupported
    }
    if (file.size > MAX_FILE_SIZE) {
      return { file, name: file.name, hasSkillMd: false, skillMdPreview: '', error: '文件大小超过 20MB' };
    }

    const entry = { file, name: file.name.replace(/\.[^.]+$/, ''), hasSkillMd: null, skillMdPreview: '', error: null };

    if (ext === '.md') {
      try {
        const content = await file.text();
        entry.skillMdPreview = content;
        entry.hasSkillMd = true;
      } catch { /* ignore */ }
    } else if (ext === '.zip') {
      try {
        const ab = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(ab);
        const files = Object.keys(zip.files);
        const skillMdFile = files.find((f) => f.toLowerCase().endsWith('skill.md') && !zip.files[f].dir);
        if (skillMdFile) {
          entry.skillMdPreview = await zip.file(skillMdFile).async('string');
          entry.hasSkillMd = true;
        } else {
          entry.hasSkillMd = false;
        }
      } catch {
        entry.hasSkillMd = false;
      }
    }

    return entry;
  };

  // Handle multi-file selection (.md/.zip)
  const handleFileSelect = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    if (isUpgrade) {
      // Upgrade mode: only first file
      const entry = await processFile(fileList[0]);
      if (!entry) { showError('仅支持 .md 和 .zip 文件'); return; }
      if (entry.error) { showError(entry.error); return; }
      setSelectedFiles([entry]);
      if (!form.name) setForm((f) => ({ ...f, name: entry.name }));
      setHasSkillMd(entry.hasSkillMd);
      setSkillMdPreview(entry.skillMdPreview);
    } else {
      // Batch mode
      const entries = [];
      for (const file of fileList) {
        const entry = await processFile(file);
        if (entry) entries.push(entry);
      }
      if (entries.length === 0) { showError('没有可上传的文件（仅支持 .md 和 .zip）'); return; }
      setSelectedFiles((prev) => [...prev, ...entries]);
      // Show preview for first entry
      if (entries.length > 0) {
        setHasSkillMd(entries[0].hasSkillMd);
        setSkillMdPreview(entries[0].skillMdPreview);
      }
    }

    // Reset input value so same file can be re-selected
    if (e.target.value) e.target.value = '';
  };

  // Handle folder selection (multi-directory support)
  const handleFolderSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsPackaging(true);
    setPackagingProgress(10);

    const fileList = Array.from(files);

    // Group files by root directory name
    const dirMap = {};
    for (const file of fileList) {
      const parts = (file.webkitRelativePath || file.name).split('/');
      const rootDir = parts[0] || 'skill';
      if (!dirMap[rootDir]) dirMap[rootDir] = [];
      dirMap[rootDir].push(file);
    }

    const dirNames = Object.keys(dirMap);
    setPackagingProgress(30);

    try {
      const entries = [];
      const total = dirNames.length;
      for (let i = 0; i < total; i++) {
        const dirName = dirNames[i];
        const dirFiles = dirMap[dirName];

        // Check for skill.md
        const skillMdEntry = dirFiles.find((f) => {
          const path = f.webkitRelativePath || f.name;
          return path.toLowerCase().endsWith('skill.md');
        });

        const zip = new JSZip();
        for (const file of dirFiles) {
          const path = file.webkitRelativePath || file.name;
          if (!file.dir) {
            const data = await file.arrayBuffer();
            zip.file(path, data);
          }
        }

        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        if (blob.size > MAX_FILE_SIZE) {
          entries.push({ file: null, name: dirName, hasSkillMd: false, skillMdPreview: '', error: '打包后超过 20MB' });
          continue;
        }

        const zipFile = new File([blob], `${dirName}.zip`, { type: 'application/zip' });
        let skillMdContent = '';
        let detected = false;
        if (skillMdEntry) {
          skillMdContent = await skillMdEntry.text();
          detected = true;
        }

        entries.push({
          file: zipFile,
          name: dirName,
          hasSkillMd: detected,
          skillMdPreview: skillMdContent,
          error: null
        });

        setPackagingProgress(30 + Math.round((i + 1) / total * 60));
      }

      setSelectedFiles((prev) => [...prev, ...entries]);
      if (entries.length > 0) {
        setHasSkillMd(entries[0].hasSkillMd);
        setSkillMdPreview(entries[0].skillMdPreview);
      }

      setPackagingProgress(100);
    } catch (err) {
      showError('文件夹打包失败: ' + err.message);
    }
    setIsPackaging(false);

    if (e.target.value) e.target.value = '';
  };

  // Remove a file from the selected list
  const removeFile = (index) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Update preview to first remaining
      if (next.length > 0) {
        setHasSkillMd(next[0].hasSkillMd);
        setSkillMdPreview(next[0].skillMdPreview);
      } else {
        setHasSkillMd(null);
        setSkillMdPreview('');
      }
      return next;
    });
  };

  // Drag-and-drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate when leaving the drop zone
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget)) {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    // Try to read entries (supports directories)
    const entries = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    if (entries.length === 0) {
      // Fallback to files
      const droppedFiles = Array.from(e.dataTransfer.files);
      const processed = [];
      for (const file of droppedFiles) {
        const entry = await processFile(file);
        if (entry) processed.push(entry);
      }
      if (processed.length > 0) {
        setSelectedFiles((prev) => [...prev, ...processed]);
        if (processed.length > 0) {
          setHasSkillMd(processed[0].hasSkillMd);
          setSkillMdPreview(processed[0].skillMdPreview);
        }
      }
      return;
    }

    // Read all entries (files and directories)
    setIsPackaging(true);
    setPackagingProgress(10);

    const readEntry = (entry) => {
      return new Promise((resolve) => {
        if (entry.isFile) {
          entry.file((file) => resolve(file), () => resolve(null));
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          const allEntries = [];
          const readBatch = () => {
            reader.readEntries(async (batch) => {
              if (batch.length === 0) {
                const files = [];
                for (const e of allEntries) {
                  const f = await readEntry(e);
                  if (f) {
                    if (Array.isArray(f)) files.push(...f);
                    else files.push(f);
                  }
                }
                resolve(files);
              } else {
                allEntries.push(...batch);
                readBatch();
              }
            }, () => resolve([]));
          };
          readBatch();
        } else {
          resolve(null);
        }
      });
    };

    const processed = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.isDirectory) {
        // Package directory as ZIP
        const dirName = entry.name;
        const dirFiles = await readEntry(entry);
        if (!dirFiles || dirFiles.length === 0) continue;

        const zip = new JSZip();
        for (const file of dirFiles) {
          const data = await file.arrayBuffer();
          zip.file(`${dirName}/${file.name}`, data);
        }

        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        if (blob.size > MAX_FILE_SIZE) {
          processed.push({ file: null, name: dirName, hasSkillMd: false, skillMdPreview: '', error: '打包后超过 20MB' });
          continue;
        }

        const zipFile = new File([blob], `${dirName}.zip`, { type: 'application/zip' });
        const skillMdFile = dirFiles.find((f) => f.name.toLowerCase() === 'skill.md');
        let skillMdContent = '';
        let detected = false;
        if (skillMdFile) {
          skillMdContent = await skillMdFile.text();
          detected = true;
        }

        processed.push({ file: zipFile, name: dirName, hasSkillMd: detected, skillMdPreview: skillMdContent, error: null });
      } else {
        // Single file
        const file = await readEntry(entry);
        if (file && !Array.isArray(file)) {
          const entryResult = await processFile(file);
          if (entryResult) processed.push(entryResult);
        }
      }
      setPackagingProgress(10 + Math.round((i + 1) / entries.length * 80));
    }

    if (processed.length > 0) {
      setSelectedFiles((prev) => [...prev, ...processed]);
      setHasSkillMd(processed[0].hasSkillMd);
      setSkillMdPreview(processed[0].skillMdPreview);
    } else {
      showError('没有可上传的文件（仅支持 .md 和 .zip）');
    }

    setIsPackaging(false);
    setPackagingProgress(100);
  };

  // Single upload helper
  const uploadSingle = async (fileEntry) => {
    const formData = new FormData();
    formData.append('file', fileEntry.file);

    if (isUpgrade) {
      formData.append('skill_id', upgradeSkill.id);
      formData.append('description', form.description);
      formData.append('version', form.version);
    } else {
      formData.append('project_id', projectId);
      formData.append('name', fileEntry.name || fileEntry.file.name.replace(/\.[^.]+$/, ''));
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('version', form.version);
    }

    const url = isUpgrade ? '/api/skill/upgrade' : '/api/skill/';
    const res = await API.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  };

  // Batch submit: upload all files sequentially
  const handleSubmit = async () => {
    const validFiles = selectedFiles.filter((f) => f.file && !f.error);
    if (validFiles.length === 0) {
      showError('请选择文件或文件夹');
      return;
    }

    // For upgrade mode, still single-file
    if (isUpgrade) {
      setLoading(true);
      try {
        const result = await uploadSingle(validFiles[0]);
        if (result.success) {
          showSuccess('Skill 升级成功');
          resetState();
          onCreated();
          handleClose();
        } else {
          showError(result.message);
        }
      } catch (err) {
        showError(err);
      }
      setLoading(false);
      return;
    }

    // Batch mode
    if (validFiles.length === 1) {
      // Single file: direct upload (no batch UI)
      setLoading(true);
      try {
        const result = await uploadSingle(validFiles[0]);
        if (result.success) {
          showSuccess('Skill 创建成功');
          resetState();
          onCreated();
          handleClose();
        } else {
          showError(result.message);
        }
      } catch (err) {
        showError(err);
      }
      setLoading(false);
      return;
    }

    // Multi-file batch upload
    setIsBatchUploading(true);
    setBatchProgress({ current: 0, total: validFiles.length });
    const results = validFiles.map((f) => ({ name: f.name, status: 'pending', message: '' }));
    setBatchResults([...results]);

    let successCount = 0;
    for (let i = 0; i < validFiles.length; i++) {
      results[i].status = 'uploading';
      setBatchResults([...results]);
      setBatchProgress({ current: i + 1, total: validFiles.length });

      try {
        const result = await uploadSingle(validFiles[i]);
        if (result.success) {
          results[i].status = 'success';
          successCount++;
        } else {
          results[i].status = 'error';
          results[i].message = result.message || '上传失败';
        }
      } catch (err) {
        results[i].status = 'error';
        results[i].message = err.message || '网络错误';
      }
      setBatchResults([...results]);
    }

    setIsBatchUploading(false);

    if (successCount > 0) {
      showSuccess(`批量上传完成: ${successCount}/${validFiles.length} 成功`);
      onCreated();
    }

    // If all failed, show error
    if (successCount === 0) {
      showError('所有文件上传失败');
    }
  };

  // Check if we're in batch mode (multiple files, not upgrade)
  const isBatch = !isUpgrade && selectedFiles.length > 1;
  const validFileCount = selectedFiles.filter((f) => f.file && !f.error).length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {isUpgrade ? `升级 Skill: ${upgradeSkill.name}` : (isBatch ? `批量上传 (${validFileCount} 个文件)` : '上传 Skill')}
        <IconButton size="small" onClick={handleClose} disabled={isBatchUploading}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Upload mode tabs */}
          {!isUpgrade && (
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button
                variant={uploadMode === 'file' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => { setUploadMode('file'); resetState(); }}
                startIcon={<IconFileText size={16} />}
                disabled={isBatchUploading}
              >
                文件上传
              </Button>
              <Button
                variant={uploadMode === 'folder' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => { setUploadMode('folder'); resetState(); }}
                startIcon={<IconFolderUp size={16} />}
                disabled={isBatchUploading}
              >
                文件夹上传
              </Button>
            </Box>
          )}

          {/* Drag & Drop Zone */}
          {!isUpgrade && !isBatchUploading && (
            <Box
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: `2px dashed ${dragActive ? theme.palette.primary.main : theme.palette.divider}`,
                bgcolor: dragActive
                  ? (theme.palette.mode === 'dark' ? 'rgba(33,150,243,0.12)' : 'rgba(33,150,243,0.06)')
                  : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                textAlign: 'center',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: theme.palette.primary.light,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(33,150,243,0.06)' : 'rgba(33,150,243,0.03)'
                }
              }}
              onClick={() => uploadMode === 'file' ? fileInputRef.current?.click() : folderInputRef.current?.click()}
            >
              <IconDragDrop size={32} color={dragActive ? theme.palette.primary.main : theme.palette.text.secondary} style={{ opacity: dragActive ? 1 : 0.5 }} />
              <Typography variant="body2" sx={{ mt: 1, color: dragActive ? theme.palette.primary.main : theme.palette.text.secondary }}>
                {dragActive ? '释放文件到此处' : '拖拽文件到此处，或点击选择'}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, opacity: 0.7 }}>
                支持多选 .md/.zip 文件，拖拽文件夹自动打包
              </Typography>
              {/* Hidden inputs */}
              <input ref={fileInputRef} type="file" hidden multiple accept=".md,.zip" onChange={handleFileSelect} />
              <input ref={folderInputRef} type="file" hidden webkitdirectory="" directory="" onChange={handleFolderSelect} />
            </Box>
          )}

          {/* Traditional file/folder select buttons (alternative) */}
          {!isUpgrade && !isBatchUploading && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {uploadMode === 'file' ? (
                <Button variant="outlined" component="label" size="small" startIcon={<IconUpload size={14} />}>
                  选择文件 (.md / .zip)
                  <input type="file" hidden multiple accept=".md,.zip" onChange={handleFileSelect} />
                </Button>
              ) : (
                <Button variant="outlined" component="label" size="small" startIcon={<IconFolder size={14} />}>
                  选择文件夹
                  <input type="file" hidden webkitdirectory="" directory="" onChange={handleFolderSelect} />
                </Button>
              )}
              {selectedFiles.length > 0 && !isBatchUploading && (
                <Button size="small" color="error" onClick={() => { setSelectedFiles([]); setHasSkillMd(null); setSkillMdPreview(''); }}>
                  清空列表
                </Button>
              )}
            </Box>
          )}

          {/* Packaging progress */}
          {isPackaging && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={packagingProgress} />
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                打包中... {packagingProgress}%
              </Typography>
            </Box>
          )}

          {/* File list (batch mode) */}
          {selectedFiles.length > 0 && !isBatchUploading && (
            <Box sx={{ maxHeight: 200, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
              {selectedFiles.map((entry, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
                    borderBottom: index < selectedFiles.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                    '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }
                  }}
                >
                  {entry.error ? (
                    <IconFileX size={16} color={theme.palette.error.main} />
                  ) : entry.hasSkillMd ? (
                    <IconFileCheck size={16} color={theme.palette.success.main} />
                  ) : (
                    <IconFileText size={16} color={theme.palette.text.secondary} />
                  )}
                  <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.name}
                    {entry.error && <span style={{ color: theme.palette.error.main, marginLeft: 4 }}>({entry.error})</span>}
                  </Typography>
                  {!isBatchUploading && (
                    <IconButton size="small" onClick={() => removeFile(index)} sx={{ p: 0.25 }}>
                      <IconX size={14} />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Batch upload progress */}
          {isBatchUploading && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  批量上传中 {batchProgress.current}/{batchProgress.total}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={batchProgress.total > 0 ? (batchProgress.current / batchProgress.total * 100) : 0}
                sx={{ mb: 1 }}
              />
              <Box sx={{ maxHeight: 160, overflow: 'auto' }}>
                {batchResults.map((r, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.3 }}>
                    {r.status === 'success' && <IconFileCheck size={14} color={theme.palette.success.main} />}
                    {r.status === 'error' && <IconFileX size={14} color={theme.palette.error.main} />}
                    {r.status === 'uploading' && <LinearProgress sx={{ width: 14, height: 2 }} />}
                    {r.status === 'pending' && <IconFileText size={14} style={{ opacity: 0.3 }} />}
                    <Typography variant="caption" sx={{
                      flex: 1,
                      color: r.status === 'error' ? theme.palette.error.main : r.status === 'success' ? theme.palette.success.main : theme.palette.text.secondary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {r.name}
                      {r.message && ` — ${r.message}`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* skill.md detection result (single file mode) */}
          {!isBatch && hasSkillMd === true && (
            <Box sx={{ p: 1, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(76,175,80,0.1)' : 'rgba(76,175,80,0.08)', border: `1px solid ${theme.palette.success.main}` }}>
              <Typography variant="caption" sx={{ color: theme.palette.success.main }}>
                已检测到 skill.md
              </Typography>
            </Box>
          )}
          {!isBatch && hasSkillMd === false && (
            <Box sx={{ p: 1, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,152,0,0.1)' : 'rgba(255,152,0,0.08)', border: `1px solid ${theme.palette.warning.main}` }}>
              <Typography variant="caption" sx={{ color: theme.palette.warning.main }}>
                未找到 skill.md，请在下方填写名称和描述信息
              </Typography>
            </Box>
          )}

          {/* Metadata fields */}
          {!isUpgrade && !isBatch && (
            <TextField label="名称" size="small" fullWidth value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={isBatchUploading} />
          )}
          {!isUpgrade && isBatch && (
            <Box sx={{ p: 1, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(33,150,243,0.08)' : 'rgba(33,150,243,0.05)', border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="caption" sx={{ color: theme.palette.primary.main }}>
                批量模式: 每个文件/文件夹名称自动作为 Skill 名称，下方设置共享描述和分类
              </Typography>
            </Box>
          )}
          {isUpgrade && (
            <Box sx={{ p: 1, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(33,150,243,0.08)' : 'rgba(33,150,243,0.05)', border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="caption" sx={{ color: theme.palette.primary.main }}>
                继承自: {upgradeSkill.name} (项目: {upgradeSkill.project_name || '—'}) · 当前版本: v{upgradeSkill.version || '—'}
              </Typography>
            </Box>
          )}
          <TextField
            label="描述"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required={!isBatch && hasSkillMd === false}
            disabled={isBatchUploading}
          />
          {!isUpgrade && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>分类</InputLabel>
                <Select value={form.category} label="分类" onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} disabled={isBatchUploading}>
                  {SKILL_CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!isBatch && (
                <TextField label="版本" size="small" sx={{ flex: 1 }} value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} disabled={isBatchUploading} />
              )}
            </Box>
          )}
          {isUpgrade && (
            <TextField label="版本号" size="small" fullWidth value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
          )}

          {/* Content preview (single file mode) */}
          {!isBatch && skillMdPreview && (
            <Box>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5, display: 'block' }}>
                skill.md 预览
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
                  maxHeight: 200,
                  overflow: 'auto'
                }}
              >
                <MarkdownRenderer content={skillMdPreview.substring(0, 2000)} theme={theme} />
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isBatchUploading}>取消</Button>
        {!isBatchUploading ? (
          <Button variant="contained" onClick={handleSubmit} disabled={loading || isPackaging || validFileCount === 0}>
            {loading ? (isUpgrade ? '升级中...' : '上传中...') : (isUpgrade ? '升级' : (isBatch ? `批量上传 (${validFileCount})` : '上传'))}
          </Button>
        ) : (
          <Button variant="contained" disabled>
            上传中 {batchProgress.current}/{batchProgress.total}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const InstallDialog = ({ open, skill, onClose, theme }) => {
  if (!skill) return null;
  const fileName = skill.skill_type === 'complex' ? `${skill.name}.zip` : skill.file_name;
  const command = `mkdir -p .claude/skills && curl -sS -H "Authorization: Bearer sk-YOUR_TOKEN" -o .claude/skills/${fileName} ${window.location.origin}/api/skill/${skill.id}/download`;

  const handleCopy = () => {
    copy(command, '安装命令');
    showSuccess('已复制安装命令');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        一键安装 Skill
        <IconButton size="small" onClick={onClose}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          复制以下命令到项目根目录的终端执行（将 <code>sk-YOUR_TOKEN</code> 替换为你的 API Token）：
        </Typography>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${theme.palette.divider}`,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
            position: 'relative'
          }}
        >
          {command}
          <Tooltip title="复制" arrow>
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{ position: 'absolute', top: 4, right: 4 }}
            >
              <IconCopy size={16} />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: theme.palette.text.secondary }}>
          安装后文件位于 .claude/skills/{fileName}，Claude Code 会自动加载。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        <Button variant="contained" startIcon={<IconCopy size={16} />} onClick={handleCopy}>
          复制命令
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DetailDialog = ({ open, skill, onClose, theme }) => {
  if (!skill) return null;
  const isComplex = skill.skill_type === 'complex';
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isComplex ? <IconFileZip size={20} color={theme.palette.warning.main} /> : <IconFileText size={20} color={theme.palette.primary.main} />}
          {skill.name}
        </Box>
        <IconButton size="small" onClick={onClose}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">{skill.description || '暂无描述'}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {skill.category && <Chip label={skill.category} size="small" color="primary" />}
            <Chip
              label={isComplex ? 'ZIP (复杂)' : skill.file_type?.toUpperCase()}
              size="small"
              variant="outlined"
              color={isComplex ? 'warning' : 'default'}
            />
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, lineHeight: '24px' }}>
              作者: {skill.user_name} · 下载: {skill.downloads}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
            maxHeight: 400,
            overflow: 'auto'
          }}
        >
          <MarkdownRenderer content={skill.content || ''} theme={theme} />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const SkillMarket = () => {
  const theme = useTheme();
  const [isLoading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [installSkill, setInstallSkill] = useState(null);
  const [detailSkill, setDetailSkill] = useState(null);
  const [upgradeSkill, setUpgradeSkill] = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, userRes] = await Promise.allSettled([
        API.get('/api/skill-project/?p=0'),
        API.get('/api/user/self')
      ]);
      if (projRes.status === 'fulfilled') {
        const { success, data } = projRes.value.data;
        if (success) setProjects(data || []);
      }
      if (userRes.status === 'fulfilled') {
        const { success, data } = userRes.value.data;
        if (success) setUser(data);
      }
    } catch (err) {
      showError(err);
    }
    setLoading(false);
  }, []);

  const loadProjectSkills = useCallback(async (projectId) => {
    setLoading(true);
    try {
      const [skillsRes, catRes] = await Promise.allSettled([
        API.get(`/api/skill/?p=0&project_id=${projectId}`),
        API.get('/api/skill/categories')
      ]);
      if (skillsRes.status === 'fulfilled') {
        const { success, data } = skillsRes.value.data;
        if (success) setSkills(data || []);
      }
      if (catRes.status === 'fulfilled') {
        const { success, data } = catRes.value.data;
        if (success) setCategories(data || []);
      }
    } catch (err) {
      showError(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleProjectClick = (project) => {
    setCurrentProject(project);
    setSearchKeyword('');
    setCategoryFilter('all');
    loadProjectSkills(project.id);
  };

  const handleBackToProjects = () => {
    setCurrentProject(null);
    setSkills([]);
    setSearchKeyword('');
    setCategoryFilter('all');
    loadProjects();
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`确定删除项目「${project.name}」？`)) return;
    try {
      const res = await API.delete(`/api/skill-project/${project.id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess('项目已删除');
        loadProjects();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err);
    }
  };

  const handleDownload = async (skill) => {
    try {
      const res = await API.get(`/api/skill/${skill.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = skill.file_name;
      a.click();
      window.URL.revokeObjectURL(url);
      showSuccess('下载成功');
    } catch (err) {
      showError(err);
    }
  };

  const handleDeleteSkill = async (skill) => {
    if (!window.confirm(`确定删除 Skill「${skill.name}」？`)) return;
    try {
      const res = await API.delete(`/api/skill/${skill.id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess('Skill 已删除');
        if (currentProject) loadProjectSkills(currentProject.id);
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err);
    }
  };

  const filteredSkills = useMemo(() => {
    let result = skills;
    if (categoryFilter !== 'all') {
      result = result.filter((s) => s.category === categoryFilter);
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(kw) || (s.description || '').toLowerCase().includes(kw));
    }
    return result;
  }, [skills, categoryFilter, searchKeyword]);

  // Project list view
  if (!currentProject) {
    const filteredProjects = searchKeyword.trim()
      ? projects.filter((p) => p.name.toLowerCase().includes(searchKeyword.trim().toLowerCase()) || (p.description || '').toLowerCase().includes(searchKeyword.trim().toLowerCase()))
      : projects;

    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <IconBook size={28} color={theme.palette.primary.main} />
          <Typography variant="h3" sx={{ fontWeight: 600 }}>
            Skill 市场
          </Typography>
          <Chip label={`${projects.length} 个项目`} size="small" color="primary" variant="outlined" />
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setCreateProjectOpen(true)}>
            创建项目
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="搜索项目..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            sx={{ flex: '1 1 240px', maxWidth: 360 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={18} />
                </InputAdornment>
              )
            }}
          />
        </Box>

        {isLoading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 1.5 }}>
            {Array.from(new Array(6)).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
            ))}
          </Box>
        )}

        {!isLoading && filteredProjects.length === 0 && (
          <Fade in>
            <Box sx={{ textAlign: 'center', py: 8, color: theme.palette.text.secondary }}>
              <IconFolder size={48} stroke={1} style={{ opacity: 0.3 }} />
              <Typography variant="h5" sx={{ mt: 2, opacity: 0.6 }}>
                {projects.length === 0 ? '暂无项目' : '没有匹配的项目'}
              </Typography>
            </Box>
          </Fade>
        )}

        {!isLoading && filteredProjects.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 1.5 }}>
            {filteredProjects.map((project, index) => (
              <Fade in key={project.id} timeout={{ enter: Math.min(index * 50, 500) }}>
                <div>
                  <ProjectCard
                    project={project}
                    user={user}
                    theme={theme}
                    onClick={handleProjectClick}
                    onDelete={handleDeleteProject}
                    onEdit={setEditProject}
                  />
                </div>
              </Fade>
            ))}
          </Box>
        )}

        <CreateProjectDialog open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} onCreated={loadProjects} theme={theme} />
        <EditProjectDialog open={!!editProject} project={editProject} onClose={() => setEditProject(null)} onUpdated={loadProjects} theme={theme} />
      </Box>
    );
  }

  // Project detail view (skills inside project)
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <IconButton size="small" onClick={handleBackToProjects} sx={{ mr: 0.5 }}>
          <IconArrowLeft size={20} />
        </IconButton>
        <IconFolder size={24} color={theme.palette.primary.main} />
        <Typography variant="h3" sx={{ fontWeight: 600 }}>
          {currentProject.name}
        </Typography>
        <Chip label={`${skills.length} 个 Skill`} size="small" color="primary" variant="outlined" />
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<IconUpload size={16} />} onClick={() => setUploadOpen(true)}>
          上传 Skill
        </Button>
      </Box>

      {currentProject.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ml: 5 }}>
          {currentProject.description}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="搜索 Skill..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          sx={{ flex: '1 1 240px', maxWidth: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} />
              </InputAdornment>
            )
          }}
        />
        <FormControl size="small" sx={{ flex: '0 1 200px' }}>
          <InputLabel>分类</InputLabel>
          <Select value={categoryFilter} label="分类" onChange={(e) => setCategoryFilter(e.target.value)}>
            <MenuItem value="all">全部</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 1.5 }}>
          {Array.from(new Array(6)).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      )}

      {!isLoading && filteredSkills.length === 0 && (
        <Fade in>
          <Box sx={{ textAlign: 'center', py: 8, color: theme.palette.text.secondary }}>
            <IconBook size={48} stroke={1} style={{ opacity: 0.3 }} />
            <Typography variant="h5" sx={{ mt: 2, opacity: 0.6 }}>
              {skills.length === 0 ? '暂无 Skill' : '没有匹配的 Skill'}
            </Typography>
          </Box>
        </Fade>
      )}

      {!isLoading && filteredSkills.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 1.5 }}>
          {filteredSkills.map((skill, index) => (
            <Fade in key={skill.id} timeout={{ enter: Math.min(index * 50, 500) }}>
              <div>
                <SkillCard
                  skill={skill}
                  user={user}
                  theme={theme}
                  onDownload={handleDownload}
                  onInstall={setInstallSkill}
                  onDelete={handleDeleteSkill}
                  onDetail={setDetailSkill}
                  onUpgrade={setUpgradeSkill}
                />
              </div>
            </Fade>
          ))}
        </Box>
      )}

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onCreated={() => loadProjectSkills(currentProject.id)} theme={theme} projectId={currentProject.id} upgradeSkill={null} />
      <UploadDialog
        open={!!upgradeSkill}
        onClose={() => setUpgradeSkill(null)}
        onCreated={() => loadProjectSkills(currentProject.id)}
        theme={theme}
        projectId={currentProject?.id}
        upgradeSkill={upgradeSkill}
      />
      <InstallDialog open={!!installSkill} skill={installSkill} onClose={() => setInstallSkill(null)} theme={theme} />
      <DetailDialog open={!!detailSkill} skill={detailSkill} onClose={() => setDetailSkill(null)} theme={theme} />
    </Box>
  );
};

export default SkillMarket;
