package org.example.qinglang.controller;

import org.example.qinglang.entity.CaseDetailEntity;
import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.repository.CaseDetailRepository;
import org.example.qinglang.repository.PartyRepository;
import org.example.qinglang.service.CaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller // 注意：这里使用 @Controller 方便返回 HTML 页面
@RequestMapping("/case")
public class CaseDetailController {

    @Autowired
    private CaseService caseService;

    @Autowired
    private CaseDetailRepository caseDetailRepository;

    /**
     * 页面跳转：访问 /case/detail?id=1
     * 返回 case-detail.html 模板
     */
    @GetMapping("/detail")
    public String goToDetailPage(@RequestParam("id") Integer id, Model model) {
        // 将 ID 传给前端，前端可以通过这个 ID 再去请求 REST 接口获取数据
        // 或者直接在这里查出数据放入 Model
        model.addAttribute("caseId", id);
        return "detail";
    }

    /**
     * REST 接口：返回该案件的详细 JSON 数据
     * 供前端详情页通过 AJAX 调用
     */
    @GetMapping("/api/detail/{id}")
    @ResponseBody
    public CaseEntity getCaseDetailData(@PathVariable Integer id) {
        // 这里需要你在 CaseService 中实现 findById 方法
        return caseService.getCaseById(id);
    }

    @GetMapping("/api/case-detail/{caseId}")
    public ResponseEntity<CaseDetailEntity> getDetailByCaseId(@PathVariable Integer caseId) {
        return caseDetailRepository.findByCaseId(caseId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

}