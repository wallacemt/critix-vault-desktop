export function TextureBackground() {
  return (
    <>
      <div
        className="absolute  inset-0 z-0 opacity-90 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=100&w=1200&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0   bg-gradient-to-b from-[#121212]/80 via-[#121212]/95 to-[#121212]"></div>
      </div>

    </>
  );
}
