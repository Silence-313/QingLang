package org.example.qinglang.controller;

import org.example.qinglang.service.DataSyncService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/sync")
public class SyncController {
    @Autowired
    private DataSyncService dataSyncService;

    @GetMapping("/all")
    public String sync() {
        dataSyncService.syncAll(); // 执行你写的同步逻辑[cite: 4]
        return "数据同步任务已启动";
    }
}