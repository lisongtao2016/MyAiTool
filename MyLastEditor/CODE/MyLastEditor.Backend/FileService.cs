using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace MyLastEditor.Backend
{
    public class FileService
    {
        public string ReadFile(string filePath)
        {
            try
            {
                if (!File.Exists(filePath))
                {
                    throw new FileNotFoundException($"文件不存在: {filePath}");
                }

                return File.ReadAllText(filePath, Encoding.UTF8);
            }
            catch (Exception ex)
            {
                throw new Exception($"读取文件失败: {ex.Message}", ex);
            }
        }

        public void WriteFile(string filePath, string content)
        {
            try
            {
                // 确保目录存在
                var directory = Path.GetDirectoryName(filePath);
                if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                File.WriteAllText(filePath, content, Encoding.UTF8);
            }
            catch (Exception ex)
            {
                throw new Exception($"写入文件失败: {ex.Message}", ex);
            }
        }

        public string[] GetFilesInDirectory(string directoryPath)
        {
            try
            {
                if (!Directory.Exists(directoryPath))
                {
                    return Array.Empty<string>();
                }

                return Directory.GetFiles(directoryPath);
            }
            catch (Exception ex)
            {
                throw new Exception($"获取目录文件列表失败: {ex.Message}", ex);
            }
        }

        public string[] GetDirectories(string directoryPath)
        {
            try
            {
                if (!Directory.Exists(directoryPath))
                {
                    return Array.Empty<string>();
                }

                return Directory.GetDirectories(directoryPath);
            }
            catch (Exception ex)
            {
                throw new Exception($"获取子目录列表失败: {ex.Message}", ex);
            }
        }

        public FileMetadata GetFileInfo(string filePath)
        {
            try
            {
                if (!File.Exists(filePath))
                {
                    throw new FileNotFoundException($"文件不存在: {filePath}");
                }

                var systemFileInfo = new System.IO.FileInfo(filePath);
                return new FileMetadata
                {
                    Name = systemFileInfo.Name,
                    FullPath = systemFileInfo.FullName,
                    Size = systemFileInfo.Length,
                    LastModified = systemFileInfo.LastWriteTime,
                    Extension = systemFileInfo.Extension
                };
            }
            catch (Exception ex)
            {
                throw new Exception($"获取文件信息失败: {ex.Message}", ex);
            }
        }

        public bool FileExists(string filePath)
        {
            return File.Exists(filePath);
        }

        public bool DirectoryExists(string directoryPath)
        {
            return Directory.Exists(directoryPath);
        }

        public void CreateDirectory(string directoryPath)
        {
            try
            {
                if (!Directory.Exists(directoryPath))
                {
                    Directory.CreateDirectory(directoryPath);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"创建目录失败: {ex.Message}", ex);
            }
        }

        public void DeleteFile(string filePath)
        {
            try
            {
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"删除文件失败: {ex.Message}", ex);
            }
        }

        public void DeleteDirectory(string directoryPath, bool recursive = false)
        {
            try
            {
                if (Directory.Exists(directoryPath))
                {
                    Directory.Delete(directoryPath, recursive);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"删除目录失败: {ex.Message}", ex);
            }
        }

        public string GetFileExtension(string filePath)
        {
            return Path.GetExtension(filePath).ToLower();
        }

        public string GetFileNameWithoutExtension(string filePath)
        {
            return Path.GetFileNameWithoutExtension(filePath);
        }

        public string GetDirectoryName(string filePath)
        {
            return Path.GetDirectoryName(filePath);
        }

        public string CombinePaths(params string[] paths)
        {
            return Path.Combine(paths);
        }

        public class FileMetadata
        {
            public string? Name { get; set; }
            public string? FullPath { get; set; }
            public long Size { get; set; }
            public DateTime LastModified { get; set; }
            public string? Extension { get; set; }
        }
    }
}