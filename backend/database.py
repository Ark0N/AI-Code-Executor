from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Float
from datetime import datetime
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Base(DeclarativeBase):
    pass


class Conversation(Base):
    __tablename__ = "conversations"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation")
    model: Mapped[str] = mapped_column(String(100), default="claude-sonnet-4-20250514")
    container_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    auto_fix_enabled: Mapped[bool] = mapped_column(Integer, default=0)  # SQLite uses 0/1 for bool
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    messages: Mapped[List["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"))
    role: Mapped[str] = mapped_column(String(20))  # 'user' or 'assistant'
    content: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    code_executions: Mapped[List["CodeExecution"]] = relationship(back_populates="message", cascade="all, delete-orphan")


class CodeExecution(Base):
    __tablename__ = "code_executions"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id"))
    language: Mapped[str] = mapped_column(String(20))
    code: Mapped[str] = mapped_column(Text)
    output: Mapped[str] = mapped_column(Text)
    exit_code: Mapped[int] = mapped_column(Integer)
    duration: Mapped[float] = mapped_column(Float)
    peak_cpu: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    peak_memory: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    message: Mapped["Message"] = relationship(back_populates="code_executions")
    files: Mapped[List["File"]] = relationship(back_populates="execution", cascade="all, delete-orphan")


class File(Base):
    __tablename__ = "files"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    execution_id: Mapped[int] = mapped_column(ForeignKey("code_executions.id"))
    filename: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    execution: Mapped["CodeExecution"] = relationship(back_populates="files")


class Settings(Base):
    """Application settings for Docker resource limits"""
    __tablename__ = "settings"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    value: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./conversations.db")
engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Get database session"""
    async with async_session_maker() as session:
        yield session
