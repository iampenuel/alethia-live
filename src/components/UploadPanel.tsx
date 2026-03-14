export default function UploadPanel() {
  return (
    <div className="card">
      <h2 className="section-title">Document Screenshot Upload</h2>
      <div className="upload-box">
        <input type="file" accept="image/png,image/jpeg,image/webp" />
        <p className="muted">Use screenshot or photo upload for the MVP.</p>
      </div>
    </div>
  );
}
