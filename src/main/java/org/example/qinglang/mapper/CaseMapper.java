package org.example.qinglang.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.example.qinglang.entity.CaseEntity;

@Mapper
public interface CaseMapper extends BaseMapper<CaseEntity> {
    // 继承 BaseMapper 后，selectList 等基础方法会自动可用
}