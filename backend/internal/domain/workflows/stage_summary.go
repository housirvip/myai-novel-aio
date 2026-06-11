package workflows

import (
	"context"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"myai-novel-go/internal/config"
	"myai-novel-go/internal/domain/planning"
	"myai-novel-go/internal/llm"
	"myai-novel-go/internal/llmfactory"
)

type StageSummaryInput struct {
	BookID    int64                  `json:"bookId" binding:"required"`
	ChapterNo int                    `json:"chapterNo" binding:"required"`
	Stage     string                 `json:"stage" binding:"required,oneof=plan draft final"`
	Content   string                 `json:"content" binding:"required,min=1"`
	Provider  string                 `json:"provider"`
	Model     string                 `json:"model"`
	LowModel  string                 `json:"lowModel"`
	MidModel  string                 `json:"midModel"`
	HighModel string                 `json:"highModel"`
	LLMConfig *llm.ResolvedLLMConfig `json:"llmConfig,omitempty"`
}

type StageSummaryOutput struct {
	Summary string `json:"summary"`
}

type StageSummaryWorkflow struct {
	db     *gorm.DB
	cfg    *config.Config
	llmF   *llmfactory.Factory
	logger *zap.Logger
}

func NewStageSummaryWorkflow(db *gorm.DB, cfg *config.Config, llmF *llmfactory.Factory, logger *zap.Logger) *StageSummaryWorkflow {
	return &StageSummaryWorkflow{db: db, cfg: cfg, llmF: llmF, logger: logger}
}

func (w *StageSummaryWorkflow) Run(ctx context.Context, in StageSummaryInput) (*StageSummaryOutput, error) {
	w.logger.Info("workflow.stage_summary.started", zap.Int64("bookId", in.BookID), zap.Int("chapterNo", in.ChapterNo), zap.String("stage", in.Stage), zap.Int("contentLen", len(in.Content)))
	cli, err := createLLMClient(w.llmF, in.LLMConfig, in.Provider)
	if err != nil {
		return nil, err
	}
	res, err := cli.Generate(ctx, llm.GenerateParams{
		Model:    resolveModel(in.LLMConfig, w.cfg, in.Model, llm.TierLow),
		Messages: planning.BuildStageSummaryPrompt(in.Stage, in.Content),
	})
	if err != nil {
		return nil, err
	}
	w.logger.Info("workflow.stage_summary.completed", zap.Int64("bookId", in.BookID), zap.Int("chapterNo", in.ChapterNo), zap.Int("summaryLen", len(res.Content)))
	return &StageSummaryOutput{Summary: res.Content}, nil
}
