package org.example.qinglang.repository;

import org.example.qinglang.entity.CaseEsEntity;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CaseEsRepository extends ElasticsearchRepository<CaseEsEntity, Integer> {
    // 自动在 title、content 和 partyNames 中进行模糊匹配
    List<CaseEsEntity> findByTitleOrContentOrPartyNames(String title, String content, String partyNames);
}