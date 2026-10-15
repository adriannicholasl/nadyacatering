<?php
header('Content-Type: application/json');

// Tangkap nama folder/paket dari request POST (default: "menu")
$folderParam = isset($_POST['folder']) ? trim($_POST['folder']) : 'menu';

// Sanitasi nama folder agar aman untuk sistem file
$cleanFolder = preg_replace("/[^a-zA-Z0-9_\- ]/", "", $folderParam);
if (empty($cleanFolder)) {
    $cleanFolder = "menu";
}

// Target folder fisik: ../images/[Nama Paket]/
$target_dir = "../images/" . $cleanFolder . "/";

// Buat direktori otomatis jika belum ada
if (!is_dir($target_dir)) {
    mkdir($target_dir, 0755, true);
}

if (isset($_FILES["fileGambar"]) || isset($_FILES["fileBukti"])) {
    $file = isset($_FILES["fileGambar"]) ? $_FILES["fileGambar"] : $_FILES["fileBukti"];
    
    // Nama file asli yang dibersihkan dari karakter ilegal
    $fileName = preg_replace("/[^a-zA-Z0-9._\-]/", "_", basename($file["name"]));
    $target_file = $target_dir . $fileName;

    if (move_uploaded_file($file["tmp_name"], $target_file)) {
        // Path relatif untuk disimpan di Firestore (contoh: "images/Paket B/Asam_Manis.jpeg")
        $db_path = "images/" . $cleanFolder . "/" . $fileName;
        echo json_encode(["status" => "success", "url" => $db_path]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal memindahkan file gambar ke server."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Tidak ada file gambar yang diupload."]);
}
?>