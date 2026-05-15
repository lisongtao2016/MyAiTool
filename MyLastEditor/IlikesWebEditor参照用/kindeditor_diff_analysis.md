# KindEditor 高度调整问题分析

## 问题描述
test_bottom_editor.html 中的 KindEditor 可以正常调整高度，而 WebForm1.aspx 中的底部 KindEditor 不能调整高度。

## 主要差异分析

### 1. 初始化时机
- **test_bottom_editor.html**: 直接初始化，没有延迟
- **WebForm1.aspx**: 使用了 `setTimeout(function() {...}, 500)` 延迟初始化

### 2. CSS 样式差异
这是最关键的区别：

**test_bottom_editor.html** (工作正常):
- 没有设置 `#testBottomKindEditorWrapper .ke-container` 的固定高度
- 允许 KindEditor 的 `resizeType: 2` 参数控制高度调整

**WebForm1.aspx** (存在问题，已修复):
- 在 `EditorPage.css` 中设置了：
  ```css
  #bottomKindEditorWrapper .ke-container {
      height: 100% !important;  /* 这个固定高度阻止了调整 */
  }
  #bottomKindEditorWrapper .ke-edit {
      height: 100% !important;  /* 这个也阻止了调整 */
  }
  ```

### 3. 已修复的样式问题
我已经修改了 `EditorPage.css`，移除了这些固定高度设置：
```css
/* 修复前 */
#bottomKindEditorWrapper .ke-container {
    height: 100% !important;  /* 移除这个 */
}

/* 修复后 */
#bottomKindEditorWrapper .ke-container {
    /* 移除 height: 100% !important，让 KindEditor 可以调整高度 */
}
```

### 4. KindEditor 初始化参数
两者的初始化参数相同：
```javascript
resizeType: 2, // 允许拖动调整宽高（2=可以调整宽高）
width: '100%',
height: '100%', // 使用百分比，让CSS控制
```

## 根本原因
WebForm1.aspx 中的 CSS 样式覆盖了 KindEditor 的 `resizeType: 2` 功能：
1. `height: 100% !important` 强制设置了固定高度
2. `!important` 优先级最高，阻止了 KindEditor 动态调整高度
3. 这与 KindEditor 的拖动调整机制冲突

## 解决方案
1. **移除固定高度样式**（已完成）：
   - 删除 `#bottomKindEditorWrapper .ke-container` 中的 `height: 100% !important`
   - 删除 `#bottomKindEditorWrapper .ke-edit` 中的 `height: 100% !important`

2. **保留必要的样式**：
   - 保留 `min-height: 200px !important` 确保最小高度
   - 保留 `width: 100% !important` 确保宽度
   - 保留 `overflow: visible !important` 允许调整手柄显示

3. **验证修复**：
   - 重新加载 WebForm1.aspx
   - 检查底部 KindEditor 右下角是否显示调整手柄
   - 测试是否可以拖动调整高度

## 测试验证
修改后的样式应该允许 KindEditor 的 `resizeType: 2` 参数正常工作：
1. KindEditor 会在编辑器右下角显示调整手柄
2. 用户可以通过拖动手柄调整编辑器高度
3. 高度调整不会受 CSS 固定高度限制

## 注意事项
1. 顶部 KindEditor 的样式也需要检查是否有类似问题
2. 确保所有 KindEditor 实例都能正常调整大小
3. 测试展开/收缩功能是否仍然正常工作