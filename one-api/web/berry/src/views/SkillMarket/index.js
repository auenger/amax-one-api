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
  TextareaAutosize,
  LinearProgress
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
  IconFolderUp
} from '@tabler/icons-react';
import JSZip from 'jszip';

const SKILL_CATEGORIES = ['编码', '调试', '测试', '部署', '文档', '工具', '其他'];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

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

const SkillCard = ({ skill, user, theme, onDownload, onInstall, onDelete, onDetail }) => {
  const isOwner = user && skill.user_id === user.id;
  const isAdmin = user && user.role >= 10;
  const isComplex = skill.skill_type === 'complex';

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

const UploadDialog = ({ open, onClose, onCreated, theme, projectId }) => {
  const [form, setForm] = useState({ name: '', description: '', category: '工具', version: '1.0' });
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'folder'
  const [selectedFile, setSelectedFile] = useState(null);
  const [folderZip, setFolderZip] = useState(null);
  const [folderFiles, setFolderFiles] = useState([]);
  const [hasSkillMd, setHasSkillMd] = useState(null); // null = not checked yet
  const [skillMdPreview, setSkillMdPreview] = useState('');
  const [packagingProgress, setPackagingProgress] = useState(0);
  const [isPackaging, setIsPackaging] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const resetState = useCallback(() => {
    setForm({ name: '', description: '', category: '工具', version: '1.0' });
    setSelectedFile(null);
    setFolderZip(null);
    setFolderFiles([]);
    setHasSkillMd(null);
    setSkillMdPreview('');
    setPackagingProgress(0);
    setIsPackaging(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Handle file selection (.md or .zip)
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.md' && ext !== '.zip') {
      showError('仅支持 .md 和 .zip 文件');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showError('文件大小超过 20MB 限制');
      return;
    }

    setSelectedFile(file);
    setFolderZip(null);
    setHasSkillMd(null);

    // Auto-fill name from filename
    if (!form.name) {
      setForm((f) => ({ ...f, name: file.name.replace(/\.[^.]+$/, '') }));
    }

    // For .md files, preview content
    if (ext === '.md') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSkillMdPreview(ev.target.result);
      };
      reader.readAsText(file);
    } else {
      // For .zip, try to read skill.md
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const zip = await JSZip.loadAsync(ev.target.result);
          const files = Object.keys(zip.files);
          const skillMdFile = files.find((f) => f.toLowerCase().endsWith('skill.md') && !zip.files[f].dir);
          if (skillMdFile) {
            const content = await zip.file(skillMdFile).async('string');
            setHasSkillMd(true);
            setSkillMdPreview(content);
          } else {
            setHasSkillMd(false);
            setSkillMdPreview('');
          }
        } catch {
          setHasSkillMd(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Handle folder selection
  const handleFolderSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsPackaging(true);
    setPackagingProgress(10);
    setHasSkillMd(null);

    const fileList = Array.from(files);
    setFolderFiles(fileList);

    // Check for skill.md
    const skillMdEntry = fileList.find((f) => f.name.toLowerCase() === 'skill.md' || f.webkitRelativePath.toLowerCase().endsWith('skill.md'));
    const detectedSkillMd = !!skillMdEntry;
    setHasSkillMd(detectedSkillMd);

    // Read skill.md content if present
    if (detectedSkillMd) {
      const content = await skillMdEntry.text();
      setSkillMdPreview(content);
    } else {
      setSkillMdPreview('');
    }

    setPackagingProgress(30);

    // Package with JSZip
    try {
      const zip = new JSZip();
      const rootFolder = fileList[0].webkitRelativePath.split('/')[0] || 'skill';

      for (const file of fileList) {
        const path = file.webkitRelativePath || file.name;
        if (!file.dir) {
          const data = await file.arrayBuffer();
          zip.file(path, data);
        }
      }

      setPackagingProgress(70);

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

      setPackagingProgress(100);

      if (blob.size > MAX_FILE_SIZE) {
        showError('打包后文件大小超过 20MB 限制');
        setIsPackaging(false);
        return;
      }

      const zipFile = new File([blob], `${rootFolder}.zip`, { type: 'application/zip' });
      setFolderZip(zipFile);
      setSelectedFile(null);

      // Auto-fill name from folder name
      if (!form.name) {
        setForm((f) => ({ ...f, name: rootFolder }));
      }
    } catch (err) {
      showError('文件夹打包失败: ' + err.message);
    }
    setIsPackaging(false);
  };

  const handleSubmit = async () => {
    const fileToUpload = selectedFile || folderZip;
    if (!fileToUpload) {
      showError('请选择文件或文件夹');
      return;
    }

    // For ZIP without skill.md, require description
    const ext = fileToUpload.name.substring(fileToUpload.name.lastIndexOf('.')).toLowerCase();
    if (ext === '.zip' && !hasSkillMd && !form.description) {
      showError('未找到 skill.md，请填写描述信息');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('project_id', projectId);
      formData.append('name', form.name || fileToUpload.name.replace(/\.[^.]+$/, ''));
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('version', form.version);

      const res = await API.post('/api/skill/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess('Skill 创建成功');
        resetState();
        onCreated();
        handleClose();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err);
    }
    setLoading(false);
  };

  const currentFile = selectedFile || folderZip;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        上传 Skill
        <IconButton size="small" onClick={handleClose}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Upload mode tabs */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Button
              variant={uploadMode === 'file' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => { setUploadMode('file'); resetState(); }}
              startIcon={<IconFileText size={16} />}
            >
              文件上传
            </Button>
            <Button
              variant={uploadMode === 'folder' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => { setUploadMode('folder'); resetState(); }}
              startIcon={<IconFolderUp size={16} />}
            >
              文件夹上传
            </Button>
          </Box>

          {/* File select button */}
          {uploadMode === 'file' ? (
            <Box>
              <Button variant="outlined" component="label" size="small" startIcon={<IconUpload size={14} />}>
                选择文件 (.md / .zip)
                <input ref={fileInputRef} type="file" hidden accept=".md,.zip" onChange={handleFileSelect} />
              </Button>
              {currentFile && (
                <Typography variant="caption" sx={{ ml: 1, color: theme.palette.text.secondary }}>
                  {currentFile.name} ({(currentFile.size / 1024).toFixed(1)} KB)
                </Typography>
              )}
            </Box>
          ) : (
            <Box>
              <Button variant="outlined" component="label" size="small" startIcon={<IconFolder size={14} />}>
                选择文件夹
                <input ref={folderInputRef} type="file" hidden webkitdirectory="" directory="" onChange={handleFolderSelect} />
              </Button>
              {folderZip && (
                <Typography variant="caption" sx={{ ml: 1, color: theme.palette.text.secondary }}>
                  {folderZip.name} ({(folderZip.size / 1024).toFixed(1)} KB, {folderFiles.length} 个文件)
                </Typography>
              )}
              {isPackaging && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress variant="determinate" value={packagingProgress} />
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    打包中... {packagingProgress}%
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* skill.md detection result */}
          {hasSkillMd === true && (
            <Box sx={{ p: 1, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(76,175,80,0.1)' : 'rgba(76,175,80,0.08)', border: `1px solid ${theme.palette.success.main}` }}>
              <Typography variant="caption" sx={{ color: theme.palette.success.main }}>
                已检测到 skill.md
              </Typography>
            </Box>
          )}
          {hasSkillMd === false && (
            <Box sx={{ p: 1, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,152,0,0.1)' : 'rgba(255,152,0,0.08)', border: `1px solid ${theme.palette.warning.main}` }}>
              <Typography variant="caption" sx={{ color: theme.palette.warning.main }}>
                未找到 skill.md，请在下方填写名称和描述信息
              </Typography>
            </Box>
          )}

          {/* Metadata fields */}
          <TextField label="名称" size="small" fullWidth value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField
            label="描述"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required={hasSkillMd === false}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>分类</InputLabel>
              <Select value={form.category} label="分类" onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {SKILL_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="版本" size="small" sx={{ flex: 1 }} value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
          </Box>

          {/* Content preview */}
          {skillMdPreview && (
            <Box>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5, display: 'block' }}>
                skill.md 预览
              </Typography>
              <TextareaAutosize
                readOnly
                value={skillMdPreview.substring(0, 2000)}
                style={{
                  width: '100%',
                  minHeight: 120,
                  maxHeight: 200,
                  padding: 8,
                  borderRadius: 4,
                  border: `1px solid ${theme.palette.divider}`,
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  background: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  resize: 'vertical',
                  overflow: 'auto'
                }}
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || isPackaging || !currentFile}>
          {loading ? '上传中...' : '上传'}
        </Button>
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
        <TextareaAutosize
          readOnly
          value={skill.content || ''}
          style={{
            width: '100%',
            minHeight: 300,
            padding: 12,
            borderRadius: 4,
            border: `1px solid ${theme.palette.divider}`,
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            background: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
            color: theme.palette.text.primary,
            resize: 'vertical',
            overflow: 'auto'
          }}
        />
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
                />
              </div>
            </Fade>
          ))}
        </Box>
      )}

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onCreated={() => loadProjectSkills(currentProject.id)} theme={theme} projectId={currentProject.id} />
      <InstallDialog open={!!installSkill} skill={installSkill} onClose={() => setInstallSkill(null)} theme={theme} />
      <DetailDialog open={!!detailSkill} skill={detailSkill} onClose={() => setDetailSkill(null)} theme={theme} />
    </Box>
  );
};

export default SkillMarket;
