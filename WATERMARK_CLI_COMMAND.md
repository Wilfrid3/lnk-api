# Watermark CLI Command

This command allows you to apply watermarks to existing images that were uploaded before the watermarking system was implemented.

## Usage

```bash
npm run watermark:apply [options]
```

## Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--start-date` | `-s` | Only process images uploaded after this date | `--start-date 2024-01-01` |
| `--end-date` | `-e` | Only process images uploaded before this date | `--end-date 2024-12-31` |
| `--dry-run` | `-d` | Preview what would be processed without applying watermarks | `--dry-run` |
| `--image-type` | `-t` | Type of images to watermark: post, avatar, cover, chat, or all | `--image-type post` |
| `--batch-size` | `-b` | Number of images to process in parallel (1-50, default: 10) | `--batch-size 5` |

## Examples

### 1. Preview all images that would be watermarked (dry run)
```bash
npm run watermark:apply -- --dry-run
```

### 2. Apply watermarks to all images uploaded in 2024
```bash
npm run watermark:apply -- --start-date 2024-01-01 --end-date 2024-12-31
```

### 3. Apply watermarks to post images only, uploaded after a specific date
```bash
npm run watermark:apply -- --image-type post --start-date 2024-06-01
```

### 4. Apply watermarks to all images with a smaller batch size (for large datasets)
```bash
npm run watermark:apply -- --batch-size 5
```

### 5. Apply watermarks to all existing images
```bash
npm run watermark:apply
```

## How it works

1. **Backup Creation**: The command automatically creates a backup of each original image (`.backup` extension) before applying the watermark
2. **Batch Processing**: Images are processed in configurable batches to prevent memory issues
3. **Progress Tracking**: Shows real-time progress and detailed summary
4. **Error Handling**: Continues processing even if some images fail, with detailed error reporting
5. **Watermark Configuration**: Automatically determines the appropriate watermark style based on image type

## Watermark Types

- **post**: Default watermark for post images (center position, 25% size, 60% opacity)
- **avatar**: Subtle watermark for profile pictures (bottom-right, 15% size, 30% opacity)
- **cover**: Subtle watermark for cover images (bottom-right, 12% size, 25% opacity)
- **chat**: Small watermark for chat images (bottom-right, 15% size, 30% opacity)

## Safety Features

- **Dry Run Mode**: Always test with `--dry-run` first to see what would be processed
- **Automatic Backups**: Original images are preserved with `.backup` extension
- **File Existence Check**: Skips missing files gracefully
- **Format Validation**: Only processes supported image formats

## Output

The command provides detailed logging including:
- Total images found
- Processing progress with percentages
- Individual file results (success/error)
- Final summary with counts

## Recovery

If you need to restore original images:
```bash
# Find all backup files
find upload/ -name "*.backup" -type f

# Restore a specific image
mv /path/to/image.png.backup /path/to/image.png
```

## Performance Tips

- Use smaller batch sizes (`--batch-size 5`) for large images or limited memory
- Process specific date ranges to avoid processing all images at once
- Use `--image-type` to target specific types of images
- Monitor disk space as backups will temporarily double storage usage

## Troubleshooting

### Common Issues

1. **Out of Memory**: Reduce `--batch-size` to 2-5
2. **Permission Errors**: Ensure the process has write access to upload directories
3. **Missing Files**: The command will skip and report missing files
4. **Unsupported Formats**: Only JPEG, PNG, WebP, TIFF, and BMP are supported

### Logs

Check the console output for detailed information about:
- Which files are being processed
- Any errors encountered
- Final success/failure counts
