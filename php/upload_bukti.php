<?php
header('Content-Type: application/json');

// Tambahkan garis miring (/) di akhir path folder
$target_dir = "../uploads/payment/"; 

if (!is_dir($target_dir)) {
    mkdir($target_dir, 0755, true);
}

if (isset($_FILES["fileBukti"])) {
    $file = $_FILES["fileBukti"];
    
    $fileName = time() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", basename($file["name"]));
    $target_file = $target_dir . $fileName;

    if (move_uploaded_file($file["tmp_name"], $target_file)) {
        echo json_encode(["status" => "success", "url" => $target_file]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal memindahkan file gambar."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Tidak ada file yang terdeteksi."]);
}
?>